# KubeLego

## 部署

Deploy Letsencrypt certificate provider

* 创建命名空间

```bash
$ kubectl create namespace kube-lego
```

* RBAC

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-lego
  namespace: kube-lego
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-lego
rules:
- apiGroups:
  - ""
  resources:
  - pods
  verbs:
  - get
  - list
- apiGroups:
  - ""
  resources:
  - services
  - endpoints
  verbs:
  - create
  - get
  - delete
  - update
- apiGroups:
  - extensions
  resources:
  - ingresses
  verbs:
  - get
  - update
  - create
  - list
  - patch
  - delete
  - watch
- apiGroups:
  - ""
  resources:
  - endpoints
  - secrets
  verbs:
  - get
  - create
  - update
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-lego
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-lego
subjects:
- kind: ServiceAccount
  name: kube-lego
  namespace: kube-lego
EOF
```

* 部署 kube-lego

```bash
$ cat <<EOF | kubectl -n kube-lego apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-lego
data:
  # modify this to specify your address
  lego.email: "jinsyin@gmail.com"
  # configure letsencrypt's production api
  lego.url: "https://acme-v01.api.letsencrypt.org/directory"
---
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: kube-lego
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kube-lego
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: kube-lego
    spec:
      serviceAccount: kube-lego
      containers:
      - name: kube-lego
        image: jetstack/kube-lego:0.1.5
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8080
        env:
        - name: LEGO_EMAIL
          valueFrom:
            configMapKeyRef:
              name: kube-lego
              key: lego.email
        - name: LEGO_URL
          valueFrom:
            configMapKeyRef:
              name: kube-lego
              key: lego.url
        - name: LEGO_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: LEGO_POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          timeoutSeconds: 1
EOF
```

检查：

```bash
# 检查是否在运行
$ kubectl -n kube-lego get pods
NAME                         READY     STATUS    RESTARTS   AGE
kube-lego-67cd77c754-rzrwr   1/1       Running   0          2m

# 排查一下日志
$ kubectl -n kube-lego logs -f kube-lego-67cd77c754-rzrwr
```


## 示例

* DNS Server 中添加一条 A 记录

```
Type: A
Name: exampleapp.cloud.local (your domain name)
Value: X.X.X.X (Public IP of Ingress controller)
```

* 部署示例

```bash
$ cat <<EOF | kubectl create -f -
apiVersion: v1
kind: Namespace
metadata:
  name: exampleapp
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: exampleapp
  namespace: exampleapp
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: exampleapp
    spec:
      containers:
      - image: nginx:alpine
        imagePullPolicy: IfNotPresent
        name: exampleapp
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: exampleapp-svc
  namespace: exampleapp
spec:
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
  selector:
    app: exampleapp
---
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: exampleapp-ingress
  namespace: exampleapp
  annotations:
    kubernetes.io/tls-acme: "true"
    kubernetes.io/ingress.class: "nginx"
spec:
  tls:
  - hosts:
    # CHANGE ME
    - exampleapp.cloud.local
    secretName: exampleapp-tls
  rules:
  # CHANGE ME
  - host: exampleapp.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: exampleapp-svc
          servicePort: 80
EOF
```

检查：

```bash
# 检查示例 Pod 是否正常运行
$ kubectl -n exampleapp get pods
NAME                          READY     STATUS    RESTARTS   AGE
exampleapp-57b75cb986-fg5jb   1/1       Running   0          6s

# 排查下 kube-lego 的日志
$ kubectl -n kube-lego logs -f kube-lego-67cd77c754-rzrwr

# 检查 exampleapp-tls 是否被创建
$ kubectl -n exampleapp get secrets
```

## 参考

* [jetstack/kube-lego](https://github.com/jetstack/kube-lego)
* [Kubernetes recipe: Kubernetes (kubespray) + GlusterFS (gluster-kubernetes) + Letsencrypt (kube-lego) + Nginx Ingress (nginx-ingress) ](https://medium.com/@olegsmetanin/kubernetes-recipe-kubernetes-kubespray-glusterfs-gluster-kubernetes-letsencrypt-kube-lego-595794665459)
* [lego](https://github.com/jetstack/kube-lego/tree/master/examples/nginx/lego)
