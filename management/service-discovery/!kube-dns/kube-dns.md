# kube-dns

## RBAC

在启动 kube-apiserver 的时候系统预定义了 `system:kube-dns` ClusterRoleBinding，将 `kube-system` Namespace 中的 `kube-dns` ServiceAccount 与 `system:kube-dns` ClusterRole 绑定。所以，可以在 `kube-system` Namespace 直接使用 `kube-dns` ServiceAccount 部署 kube-dns 插件即可。

```bash
$ kubectl get clusterrolebinding system:kube-dns -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system:kube-dns
  ...
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-dns
subjects:
- kind: ServiceAccount
  name: kube-dns
  namespace: kube-system

$ kubectl get clusterrole system:kube-dns -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  ...
rules:
- apiGroups:
  - ""
  resources:
  - endpoints
  - services
  verbs:
  - list
  - watch
```


## 部署 kube-dns

### 修改配置

```bash
$ wget -O kube-dns.yaml https://raw.githubusercontent.com/kubernetes/kubernetes/release-1.9/cluster/addons/dns/kube-dns.yaml.base

# 修改镜像源
$ sed -i "s|gcr\.io/google_containers*|dockerce|g" kube-dns.yaml

# 修改镜像版本（如果需要的话）
# sed -i "s|1.14.7|1.14.7|g" kube-dns.yaml

# 设置 dns 根域
$ sed -i "s|__PILLAR__DNS__DOMAIN__|cluster.local|g" kube-dns.yaml

# 设置 kube-dns ServiceIP，需要和 kubelet 配置的一致
$ sed -i "s|__PILLAR__DNS__SERVER__|172.254.0.2|g" kube-dns.yaml
```

### 部署及检查

```bash
# 部署
$ kubectl apply -f kube-dns.yaml

# 检查部署的服务
$ kubectl -n kube-system get svc,deploy,pod -l k8s-app=kube-dns
NAME           TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)         AGE
svc/kube-dns   ClusterIP   172.254.0.2   <none>        53/UDP,53/TCP   3m

NAME              DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
deploy/kube-dns   1         1         1            1           3m

NAME                           READY     STATUS    RESTARTS   AGE
po/kube-dns-5444f7d56d-5thnz   3/3       Running   0          3m

# 查看集群信息
$ kubectl cluster-info
Kubernetes master is running at https://192.168.10.80:6443
KubeDNS is running at https://192.168.10.80:6443/api/v1/namespaces/kube-system/services/kube-dns/proxy

# 排查日志
$ kubectl -n kube-system logs -f kube-dns-5444f7d56d-5thnz -c kubedns
$ kubectl -n kube-system logs -f kube-dns-5444f7d56d-5thnz -c dnsmasq
$ kubectl -n kube-system logs -f kube-dns-5444f7d56d-5thnz -c sidecar
```

### 测试 kube-dns

```bash
$ kubectl run web --image=nginx:alpine --port=80 --replicas=10
$ kubectl expose deploy/web --name=web-svc --port=80 --target-port=80

$ kubectl get service web-svc
NAME          TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
/web-svc      ClusterIP   10.254.84.60   <none>        80/TCP    9s

# 测试所有 Pod 是否都可以正常解析
$ pods=`kubectl get pod -o wide | awk '{print $1}'`
$ for pod in $pods; do kubectl exec -it $pod -- nslookup web-svc.default.svc.cluster.local; done

# 测试外网域名是否可以正常解析
$ for pod in $pods; do kubectl exec -it $pod -- nslookup baidu.com; done

# 移除测试应用
$ kubectl delete deploy/web
$ kubectl delete service/web-svc
```

### kube-dns.yaml

最终生成的 kube-dns.yaml 文件内容如下：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kube-dns
  namespace: kube-system
  labels:
    k8s-app: kube-dns
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
    kubernetes.io/name: "KubeDNS"
spec:
  selector:
    k8s-app: kube-dns
  clusterIP: 172.254.0.2
  ports:
  - name: dns
    port: 53
    protocol: UDP
  - name: dns-tcp
    port: 53
    protocol: TCP
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-dns
  namespace: kube-system
  labels:
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-dns
  namespace: kube-system
  labels:
    addonmanager.kubernetes.io/mode: EnsureExists
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: kube-dns
  namespace: kube-system
  labels:
    k8s-app: kube-dns
    kubernetes.io/cluster-service: "true"
    addonmanager.kubernetes.io/mode: Reconcile
spec:
  # replicas: not specified here:
  # 1. In order to make Addon Manager do not reconcile this replicas parameter.
  # 2. Default is 1.
  # 3. Will be tuned in real time if DNS horizontal auto-scaling is turned on.
  strategy:
    rollingUpdate:
      maxSurge: 10%
      maxUnavailable: 0
  selector:
    matchLabels:
      k8s-app: kube-dns
  template:
    metadata:
      labels:
        k8s-app: kube-dns
      annotations:
        scheduler.alpha.kubernetes.io/critical-pod: ''
    spec:
      tolerations:
      - key: "CriticalAddonsOnly"
        operator: "Exists"
      volumes:
      - name: kube-dns-config
        configMap:
          name: kube-dns
          optional: true
      containers:
      - name: kubedns
        image: dockerce/k8s-dns-kube-dns-amd64:1.14.7
        resources:
          # TODO: Set memory limits when we've profiled the container for large
          # clusters, then set request = limit to keep this container in
          # guaranteed class. Currently, this container falls into the
          # "burstable" category so the kubelet doesn't backoff from restarting it.
          limits:
            memory: 170Mi
          requests:
            cpu: 100m
            memory: 70Mi
        livenessProbe:
          httpGet:
            path: /healthcheck/kubedns
            port: 10054
            scheme: HTTP
          initialDelaySeconds: 60
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 5
        readinessProbe:
          httpGet:
            path: /readiness
            port: 8081
            scheme: HTTP
          # we poll on pod startup for the Kubernetes master service and
          # only setup the /readiness HTTP server once that's available.
          initialDelaySeconds: 3
          timeoutSeconds: 5
        args:
        - --domain=cluster.local.
        - --dns-port=10053
        - --config-dir=/kube-dns-config
        - --v=2
        env:
        - name: PROMETHEUS_PORT
          value: "10055"
        ports:
        - containerPort: 10053
          name: dns-local
          protocol: UDP
        - containerPort: 10053
          name: dns-tcp-local
          protocol: TCP
        - containerPort: 10055
          name: metrics
          protocol: TCP
        volumeMounts:
        - name: kube-dns-config
          mountPath: /kube-dns-config
      - name: dnsmasq
        image: dockerce/k8s-dns-dnsmasq-nanny-amd64:1.14.7
        livenessProbe:
          httpGet:
            path: /healthcheck/dnsmasq
            port: 10054
            scheme: HTTP
          initialDelaySeconds: 60
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 5
        args:
        - -v=2
        - -logtostderr
        - -configDir=/etc/k8s/dns/dnsmasq-nanny
        - -restartDnsmasq=true
        - --
        - -k
        - --cache-size=1000
        - --no-negcache
        - --log-facility=-
        - --server=/cluster.local/127.0.0.1#10053
        - --server=/in-addr.arpa/127.0.0.1#10053
        - --server=/ip6.arpa/127.0.0.1#10053
        ports:
        - containerPort: 53
          name: dns
          protocol: UDP
        - containerPort: 53
          name: dns-tcp
          protocol: TCP
        # see: https://github.com/kubernetes/kubernetes/issues/29055 for details
        resources:
          requests:
            cpu: 150m
            memory: 20Mi
        volumeMounts:
        - name: kube-dns-config
          mountPath: /etc/k8s/dns/dnsmasq-nanny
      - name: sidecar
        image: dockerce/k8s-dns-sidecar-amd64:1.14.7
        livenessProbe:
          httpGet:
            path: /metrics
            port: 10054
            scheme: HTTP
          initialDelaySeconds: 60
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 5
        args:
        - --v=2
        - --logtostderr
        - --probe=kubedns,127.0.0.1:10053,kubernetes.default.svc.cluster.local,5,SRV
        - --probe=dnsmasq,127.0.0.1:53,kubernetes.default.svc.cluster.local,5,SRV
        ports:
        - containerPort: 10054
          name: metrics
          protocol: TCP
        resources:
          requests:
            memory: 20Mi
            cpu: 10m
      dnsPolicy: Default  # Don't use cluster DNS.
      serviceAccountName: kube-dns
```


## 扩容

可以根据需求手动扩容 kube-dns，也可以使用 [dns-horizontal-autoscaler](./dns-horizontal-autoscaler.md) 插件实现自动扩容。

```bash
# 手动扩容
$ kubectl -n kube-system scale deploy/kube-dns --replicas=3

# 检查
$ kubectl -n kube-system get pod -l k8s-app=kube-dns -o wide
NAME                       READY  STATUS   RESTARTS  AGE  IP            NODE
kube-dns-5444f7d56d-5thnz  3/3    Running  0         2h   10.1.169.134  kube-node-2
kube-dns-5444f7d56d-76bhb  3/3    Running  0         30s  10.1.135.134  kube-node-1
kube-dns-5444f7d56d-7dql9  3/3    Running  0         30s  10.1.169.139  kube-node-2
```


## 参考

* [kube-dns](https://github.com/kubernetes/kubernetes/tree/release-1.8/cluster/addons/dns)
* [DNS Pods and Services](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
