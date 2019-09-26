# kube-proxy

## 部署 kube-proxy


### RBAC

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-proxy
  namespace: kube-system
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: system:kube-proxy
  labels:
    addonmanager.kubernetes.io/mode: Reconcile
subjects:
- kind: ServiceAccount
  name: kube-proxy
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: system:node-proxier
  apiGroup: rbac.authorization.k8s.io
```

```bash
$ kubectl apply -f kube-proxy-rbac.yaml
```

### kube-proxy-ds.yaml

为了让 Master 节点也能通过 Service IP 访问集群服务，我们需要利用 tolerations 机制将 kube-proxy 部署到 Master 节点。

```bash
# 对 DaemonSet 中的 PodSpec 设置：
tolerations:
- key: "node-role.kubernetes.io"
  value: "master"
  effect: "NoSchedule"
```

```yaml
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  labels:
    k8s-app: kube-proxy
    addonmanager.kubernetes.io/mode: Reconcile
  name: kube-proxy
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: kube-proxy
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 10%
  template:
    metadata:
      labels:
        k8s-app: kube-proxy
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      hostNetwork: true
      serviceAccountName: kube-proxy
      tolerations:
      - key: "node-role.kubernetes.io"
        value: "master"
        effect: "NoSchedule"
      containers:
      - name: kube-proxy
        image: dockerce/kube-proxy:v1.8.2
        resources:
          requests:
            cpu: 200m
        command:
        - /bin/sh
        - -c
        - kube-proxy
        - --cluster-cidr=172.1.0.0/16
        - --proxy-mode=iptables
        - --logtostderr=true
        - --v=2
        env:
        - name: KUBERNETES_SERVICE_HOST
          value: 172.254.0.1
        securityContext:
          privileged: true
        volumeMounts:
        - mountPath: /var/log
          name: varlog
          readOnly: false
        - mountPath: /run/xtables.lock
          name: xtables-lock
          readOnly: false
        - mountPath: /lib/modules
          name: lib-modules
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: lib-modules
        hostPath:
          path: /lib/modules
```


### kube-proxy-ds.yaml.template

```yaml
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  labels:
    k8s-app: kube-proxy
    addonmanager.kubernetes.io/mode: Reconcile
  name: kube-proxy
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: kube-proxy
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 10%
  template:
    metadata:
      labels:
        k8s-app: kube-proxy
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      {{pod_priority}}
      hostNetwork: true
      nodeSelector:
        beta.kubernetes.io/kube-proxy-ds-ready: "true"
      tolerations:
      - operator: "Exists"
        effect: "NoExecute"
      - operator: "Exists"
        effect: "NoSchedule"
      containers:
      - name: kube-proxy
        image: {{pillar['kube_docker_registry']}}/kube-proxy:{{pillar['kube-proxy_docker_tag']}}
        resources:
          requests:
            cpu: {{ cpurequest }}
        command:
        - /bin/sh
        - -c
        - kube-proxy {{cluster_cidr}} --resource-container="" --oom-score-adj=-998 {{params}} 1>>/var/log/kube-proxy.log 2>&1
        env:
        - name: KUBERNETES_SERVICE_HOST
          value: {{kubernetes_service_host_env_value}}
        {{kube_cache_mutation_detector_env_name}}
          {{kube_cache_mutation_detector_env_value}}
        securityContext:
          privileged: true
        volumeMounts:
        - mountPath: /var/log
          name: varlog
          readOnly: false
        - mountPath: /run/xtables.lock
          name: xtables-lock
          readOnly: false
        - mountPath: /lib/modules
          name: lib-modules
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      - name: lib-modules
        hostPath:
          path: /lib/modules
      serviceAccountName: kube-proxy
```


## 参考

* [Kubernetes 1.8 kube-proxy 开启 ipvs](https://www.kubernetes.org.cn/3025.html)
