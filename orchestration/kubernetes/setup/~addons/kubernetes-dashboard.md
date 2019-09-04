# Kubernetes Dashboard

Kubernetes-dashboard 1.7 版本新增了用户登录认证，用户需要通过 HTTPS 来访问 UI，并且使用 `kubeconfig` 或 `token` 来通过认证。

## 部署 kubernetes-dashboard

### 部署

```bash
$ wget -O kubernetes-dashboard.yaml https://raw.githubusercontent.com/kubernetes/dashboard/v1.8.0/src/deploy/recommended/kubernetes-dashboard.yaml

# 修改镜像源
$ sed -i "s|gcr.io/google_containers|dockerce|g" kubernetes-dashboard.yaml

# 部署
$ kubectl apply -f kubernetes-dashboard.yaml

# 检查部署的服务
$ kubectl -n kube-system get service,deploy,pod -l k8s-app=kubernetes-dashboard
NAME                       TYPE        CLUSTER-IP        EXTERNAL-IP   PORT(S)   AGE
svc/kubernetes-dashboard   ClusterIP   172.254.202.229   <none>        443/TCP   36s

NAME                          DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
deploy/kubernetes-dashboard   1         1         1            1           36s

NAME                                       READY     STATUS    RESTARTS   AGE
po/kubernetes-dashboard-689d7d9c77-dcv9b   1/1       Running   0          36s

# 排错（没有 heapster 之前会有错误提示）
$ kubectl -n kube-system logs -f po/kubernetes-dashboard-689d7d9c77-dcv9b

# 测试 web 服务是否可以访问
$ curl -k https://172.254.202.229
```

### kubernetes-dashboard.yaml

最终生成的 kubernetes-dashboard.yaml 文件如下：

```yaml
apiVersion: v1
kind: Secret
metadata:
  labels:
    k8s-app: kubernetes-dashboard
  name: kubernetes-dashboard-certs
  namespace: kube-system
type: Opaque

---

apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    k8s-app: kubernetes-dashboard
  name: kubernetes-dashboard
  namespace: kube-system

---

kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: kubernetes-dashboard-minimal
  namespace: kube-system
rules:
  # Allow Dashboard to create 'kubernetes-dashboard-key-holder' secret.
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["create"]
  # Allow Dashboard to get, update and delete Dashboard exclusive secrets.
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["kubernetes-dashboard-key-holder", "kubernetes-dashboard-certs"]
  verbs: ["get", "update", "delete"]
  # Allow Dashboard to get and update 'kubernetes-dashboard-settings' config map.
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["kubernetes-dashboard-settings"]
  verbs: ["get", "update"]
  # Allow Dashboard to get metrics from heapster.
- apiGroups: [""]
  resources: ["services"]
  resourceNames: ["heapster"]
  verbs: ["proxy"]

---

apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: kubernetes-dashboard-minimal
  namespace: kube-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: kubernetes-dashboard-minimal
subjects:
- kind: ServiceAccount
  name: kubernetes-dashboard
  namespace: kube-system

---

kind: Deployment
apiVersion: apps/v1beta2
metadata:
  labels:
    k8s-app: kubernetes-dashboard
  name: kubernetes-dashboard
  namespace: kube-system
spec:
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      k8s-app: kubernetes-dashboard
  template:
    metadata:
      labels:
        k8s-app: kubernetes-dashboard
    spec:
      containers:
      - name: kubernetes-dashboard
        image: gcr.io/google_containers/kubernetes-dashboard-amd64:v1.8.0
        ports:
        - containerPort: 8443
          protocol: TCP
        args:
          - --auto-generate-certificates
          # Uncomment the following line to manually specify Kubernetes API server Host
          # If not specified, Dashboard will attempt to auto discover the API server and connect
          # to it. Uncomment only if the default does not work.
          # - --apiserver-host=http://my-address:port
        volumeMounts:
        - name: kubernetes-dashboard-certs
          mountPath: /certs
          # Create on-disk volume to store exec logs
        - mountPath: /tmp
          name: tmp-volume
        livenessProbe:
          httpGet:
            scheme: HTTPS
            path: /
            port: 8443
          initialDelaySeconds: 30
          timeoutSeconds: 30
      volumes:
      - name: kubernetes-dashboard-certs
        secret:
          secretName: kubernetes-dashboard-certs
      - name: tmp-volume
        emptyDir: {}
      serviceAccountName: kubernetes-dashboard
      # Comment the following tolerations if Dashboard must not be deployed on master
      # tolerations:
      # - key: node-role.kubernetes.io/master
      #   effect: NoSchedule

---

kind: Service
apiVersion: v1
metadata:
  labels:
    k8s-app: kubernetes-dashboard
  name: kubernetes-dashboard
  namespace: kube-system
spec:
  ports:
    - port: 443
      targetPort: 8443
  selector:
    k8s-app: kubernetes-dashboard
```


## 浏览器访问

kubeconfig 文件还必须追加一行 token 配置项。默认情况下，用户是使用 `system:serviceaccount:kube-system:kubernetes-dashboard` 这个用户名来访问 Dashboard 的。

### kubectl proxy

```bash
# master
$ kubectl proxy --address='0.0.0.0' --port=8001 --accept-hosts='^*$'
```

浏览器访问：`http://<master-ip>:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/`

### 使用 token

* 创建一个管理员 ServiceAccount

```yaml
# 创建
$ cat <<EOF | kubectl create -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-admin
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-admin
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "true"
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: cluster-admin
  namespace: kube-system
EOF
```

```bash
# 查询 ServiceAccount 自动绑定的 token
$ kubectl -n kube-system get secret | grep cluster-admin-token
cluster-admin-token-fnqpk  kubernetes.io/service-account-token  3  36s

# 获取 base64 编码的 token
$ kubectl -n kube-system get secret cluster-admin-token-fnqpk -o jsonpath={.data.token} | base64 -d
```

* 创建一个普通用户 ServiceAccount

```bash
apiVersion: v1
kind: Namespace
metadata:
  name: yinrenqiang
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin
  namespace: yinrenqiang
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: admin
  annotations:
    rbac.authorization.kubernetes.io/autoupdate: "true"
  namespace: yinrenqiang
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: admin
subjects:
- kind: ServiceAccount
  name: admin
  namespace: yinrenqiang
```

```bash
# 查询 ServiceAccount 自动绑定的 token
$ kubectl -n yinrenqiang get secret | grep admin-token
admin-token-vljq4  kubernetes.io/service-account-token  3  2m

# 获取 base64 编码的 token
$ kubectl -n yinrenqiang get secret admin-token-vljq4 -o jsonpath={.data.token} | base64 -d
```

### 使用 kubeconfig

如果使用 kubeconfig 来登录 kubernetes dashboard，需要在原有 kubeconfig 的基础上增加上面的 token。

```bash
$ cat cluster-admin.kubeconfig
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: ...
    server: https://x.x.x.x:6443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: cluster-admin
  name: cluster-admin@kubernetes
current-context: cluster-admin@kubernetes
kind: Config
preferences: {}
users:
- name: cluster-admin
  user:
    as-user-extra: {}
    client-certificate-data: ...
    client-key-data: ...
    # 这里增加一个 token 字段
    token: <token-bash64>
```


## Ingress(https) --> kubernetes-dashboard(https)

默认 kubernetes-dashboard 是使用 **https** 来提供服务的，比如 `https://kubernetes-dashboard.kube-system.svc.cluster.local`。如果希望通过 **https** 模式的 Ingress（nginx ingress）来访问 **https** 模式的 kubernetes-dashboard，除了需要保证前后的证书一致外，还需要在 Ingress 在添加 `nginx.ingress.kubernetes.io/secure-backends: "true"` annotations。

* 生成证书

```bash
$ openssl genrsa -out dashboard.key 2048
$ openssl req -x509 -new -nodes -key dashboard.key -subj "/CN=ui.cloud.local" -days 3650 -out dashboard.crt
```

* 创建 Secret

```bash
# 创建之前先删除这个空的 secret
$ kubectl -n kube-system delete secret/kubernetes-dashboard-certs

$ kubectl -n kube-system create secret tls kubernetes-dashboard-certs --key=dashboard.key --cert=dashboard.crt
$ kubectl -n kube-system create secret generic kubernetes-dashboard-certs --from-file=tls.key=dashboard.key --from-file=tls.crt=dashboard.crt
```

* 创建 Ingress

我目前测试的集群环境为 kubenretes 1.8.2，使用的 Ingress Controller 是 **nginx-ingress-controller:0.11.0**。

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/secure-backends: "true"
  name: dashboard-ingress
  namespace: kube-system
spec:
  tls:
  - hosts:
    - ui.cloud.local
    secretName: kubernetes-dashboard-certs
  rules:
  - host: ui.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: kubernetes-dashboard
          servicePort: 443
EOF
```


## 最后

为了使指标（metric）和图表可用，还必须运行　[heapster](./heapster.md)。


## 参考

* [ingress configuration for dashboard](https://stackoverflow.com/questions/48324760/ingress-configuration-for-dashboard)
* [Accessing Dashboard 1.7.X and above](https://github.com/kubernetes/dashboard/wiki/Accessing-Dashboard---1.7.X-and-above)
* [](https://jimmysong.io/posts/kubernetes-dashboard-upgrade/)
https://blog.qikqiak.com/post/update-kubernetes-dashboard-more-secure/
