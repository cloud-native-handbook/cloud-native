# Keepalived

## kube-keepalived-vip

### RBAC

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-keepalived-vip
rules:
- apiGroups: [""]
  resources:
  - pods
  - nodes
  - endpoints
  - services
  - configmaps
  verbs: ["get", "list", "watch"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-keepalived-vip 
  namespace: default 
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-keepalived-vip
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-keepalived-vip
subjects:
- kind: ServiceAccount
  name: kube-keepalived-vip
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-keepalived-vip
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-keepalived-vip
subjects:
- kind: ServiceAccount
  name: kube-keepalived-vip
  namespace: default
```

```bash
$ kubectl apply -f vip-rbac.yaml
```

### ConfigMap

```bash
$ kubectl run nginx --image=nginx:alpine --port=80 --replicas=2
$ kubectl expose deploy/nginx --name=nginx --target-port=80 --port=8000
```

```yaml
# kubectl apply -f vip-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vip-configmap
data:
  172.72.4.98: default/nginx
```

kube-keepalived-vip 不支持动态修改 ConfigMap 来更新自身的配置（/etc/keepalived/keepalived.conf），但是可以间接通过修改其相关联的 Service （比如修改 Service 端口，甚至修改 SVS.spec.ports[].name 也能自动更新配置）来更新 kube-keepalived-vip 的配置，这应该是个 bug。

### 部署

```bash
$ wget -O vip-daemonset.yaml https://github.com/kubernetes/contrib/blob/master/keepalived-vip/vip-daemonset.yaml

# 修改镜像源
$ sed -i "s|gcr.io/google_containers|dockerce|g" vip-daemonset.yaml

# 添加服务账号
# spec:
#   hostNetwork: true
#   serviceAccount: kube-keepalived-vip

# 指定部署节点
$ kubectl label node k8s-node-2 type=load-balancer

# 修改 nodeSelector
# spec:
#   nodeSelector:
#      load-balancer: true
```

```bash
# 默认会暴露   端口
$ kubectl apply -f vip-daemonset.yaml
```

```yaml
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  name: kube-keepalived-vip
spec:
  template:
    metadata:
      labels:
        name: kube-keepalived-vip
    spec:
      hostNetwork: true
      serviceAccount: kube-keepalived-vip
      nodeSelector:
        type: load-balancer
      containers:
        - image: dockerce/kube-keepalived-vip:0.11
          name: kube-keepalived-vip
          imagePullPolicy: Always
          securityContext:
            privileged: true
          volumeMounts:
            - mountPath: /lib/modules
              name: modules
              readOnly: true
            - mountPath: /dev
              name: dev
          # use downward API
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          # to use unicast
          args:
          - --services-configmap=default/vip-configmap
          # unicast uses the ip of the nodes instead of multicast
          # this is useful if running in cloud providers (like AWS)
          #- --use-unicast=true
          # vrrp version can be set to 2.  Default 3.
          #- --vrrp-version=2
      volumes:
        - name: modules
          hostPath:
            path: /lib/modules
        - name: dev
          hostPath:
            path: /dev
```

### 测试

访问方式是 `VIP:SERVICE_PORT`。

```bash
$ curl http://172.72.4.98:8000
```

### keepalived.conf

如果运行多个 keepalived，其状态都是 `BACKUP`，优先级都是 `100`。

```bash
$ kubectl exec -it kube-keepalived-vip-pbnz8 -- cat /etc/keepalived/keepalived.conf
global_defs {
  vrrp_version 3
  vrrp_iptables KUBE-KEEPALIVED-VIP
}

vrrp_instance vips {
  state BACKUP
  interface eth1
  virtual_router_id 50
  priority 100
  nopreempt
  advert_int 1

  track_interface {
    eth1
  }

  virtual_ipaddress { 
    172.72.4.97
    172.72.4.98
  }
}

# Service: default/nginx
virtual_server 172.72.4.97 8000 {
  delay_loop 5
  lvs_sched wlc
  lvs_method NAT
  persistence_timeout 1800
  protocol TCP

  real_server 10.1.135.186 80 {
    weight 1
    TCP_CHECK {
      connect_port 80
      connect_timeout 3
    }
  }
  real_server 10.1.169.133 80 {
    weight 1
    TCP_CHECK {
      connect_port 80
      connect_timeout 3
    }
  }
}

# Service: default/nginx
virtual_server 172.72.4.98 8000 {
  delay_loop 5
  lvs_sched wlc
  lvs_method NAT
  persistence_timeout 1800
  protocol TCP

  real_server 10.1.135.186 80 {
    weight 1
    TCP_CHECK {
      connect_port 80
      connect_timeout 3
    }
  }
  real_server 10.1.169.133 80 {
    weight 1
    TCP_CHECK {
      connect_port 80
      connect_timeout 3
    }
  }
}
```

## Keepalived (static pod)

（没测试成功）

### vip-rbac

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-keepalived-vip
rules:
- apiGroups: [""]
  resources:
  - pods
  - nodes
  - endpoints
  - services
  - configmaps
  verbs: ["get", "list", "watch"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-keepalived-vip 
  namespace: default 
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-keepalived-vip
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-keepalived-vip
subjects:
- kind: ServiceAccount
  name: kube-keepalived-vip
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-keepalived-vip
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-keepalived-vip
subjects:
  - kind: ServiceAccount
    name: kube-keepalived-vip
    namespace: default
```

```bash
$ kubectl apply -f vip-rbac.yaml
```

### vip-cm

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vip-configmap
data:
  192.168.10.99: default/kubernetes
```

```bash
$ kubectl apply -f vip-cm.yaml
```

### vip-pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-keepalived-vip
  labels:
    name: kube-keepalived-vip
spec:
  hostNetwork: true
  serviceAccount: kube-keepalived-vip
  containers:
  - image: dockerce/kube-keepalived-vip:0.11
    name: kube-keepalived-vip
    imagePullPolicy: Always
    securityContext:
      privileged: true
    volumeMounts:
      - mountPath: /lib/modules
        name: modules
        readOnly: true
      - mountPath: /dev
        name: dev
    # use downward API
    env:
      - name: POD_NAME
        valueFrom:
          fieldRef:
            fieldPath: metadata.name
      - name: POD_NAMESPACE
        valueFrom:
          fieldRef:
            fieldPath: metadata.namespace
    # to use unicast
    args:
    - --services-configmap=default/vip-configmap
    # unicast uses the ip of the nodes instead of multicast
    # this is useful if running in cloud providers (like AWS)
    #- --use-unicast=true
    # vrrp version can be set to 2.  Default 3.
    #- --vrrp-version=2
    resources:
      requests:
        cpu: 250m
  volumes:
    - name: modules
      hostPath:
        path: /lib/modules
    - name: dev
      hostPath:
        path: /dev
```


```bash
$ cp vip-pod.yaml /etc/kubernetes/manifests/kube-keepalived-vip.yaml
```


## 参考

* [keepalived-vip](https://feisky.gitbooks.io/kubernetes/plugins/keepalived-vip.html)
* [使用 IPVS 实现 Kubernetes 入口流量负载均衡](https://www.kubernetes.org.cn/1904.html)
