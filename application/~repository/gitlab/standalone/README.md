# GitLab

## 部署

### 命名空间

```bash
$ kubectl create namespace gitlab
```

### 创建 PVC

首先需要在命名空间创建访问 Ceph 所需的用户 Secret。

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
  namespace: gitlab
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF
```

假设已经创建好了 "rbd" StorageClass，下面的 PVC 直接引用。

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: gitlab
spec:
  storageClassName: rbd
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgresql-pvc
  namespace: gitlab
spec:
  storageClassName: rbd
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: gitlab-pvc
  namespace: gitlab
spec:
  storageClassName: rbd
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
EOF
```

检查以下 PVC 的创建情况

```bash
$ kubectl -n gitlab get pvc
NAME           STATUS    VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
gitlab-pvc     Bound     pvc-68de4cc0-324f-11e8-8d5d-d4bed9ee2059   10Gi       RWO            rbd            8s
postgres-pvc   Bound     pvc-68dc2a7e-324f-11e8-8d5d-d4bed9ee2059   10Gi       RWO            rbd            8s
redis-pvc      Bound     pvc-68d9b880-324f-11e8-8d5d-d4bed9ee2059   10Gi       RWO            rbd            8s
```

### 部署 Redis

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: redis
  namespace: gitlab
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: gitlab
      tier: redis
  template:
    metadata:
      labels:
        app: gitlab
        tier: redis
    spec:
      containers:
      - name: redis
        image: sameersbn/redis
        imagePullPolicy: IfNotPresent
        ports:
        - name: redis
          containerPort: 6379
        volumeMounts:
        - name: data
          mountPath: /var/lib/redis
        readinessProbe:
          exec:
            command: 
            - redis-cli
            - ping
          initialDelaySeconds: 30
          timeoutSeconds: 5
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          timeoutSeconds: 5
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  labels:
    app: gitlab
    tier: redis
  namespace: gitlab
spec:
  type: ClusterIP
  selector:
    app: gitlab
    tier: redis
  ports:
  - name: redis
    port: 6379
    targetPort: 6379
EOF
```

检查一下部署的服务：

```bash
$ kubectl -n gitlab get pods,services,endpoints -l app=gitlab,tier=redis
NAME                       READY     STATUS    RESTARTS   AGE
po/redis-6c8b87fb8-lqr5c   1/1       Running   0          22m

NAME        TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
svc/redis   ClusterIP   172.254.8.27   <none>        6379/TCP   22m

NAME       ENDPOINTS           AGE
ep/redis   172.1.74.174:6379   22m
```

### 部署 PostgreSQL

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: postgresql
  namespace: gitlab
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: gitlab
      tier: postgresql
  template:
    metadata:
      labels:
        app: gitlab
        tier: postgresql
    spec:
      containers:
      - name: postgresql
        image: sameersbn/postgresql:9.6-2
        imagePullPolicy: IfNotPresent
        ports:
        - name: postgres
          containerPort: 5432  
        env:
        - name: DB_USER
          value: gitlab
        - name: DB_PASS
          value: passw0rd
        - name: DB_NAME
          value: gitlab_production
        - name: DB_EXTENSION
          value: pg_trgm              
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -h
            - localhost
            - -U
            - postgres
          initialDelaySeconds: 30
          timeoutSeconds: 5
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -h
            - localhost
            - -U
            - postgres
          initialDelaySeconds: 30
          timeoutSeconds: 5
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: postgresql-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  labels:
    app: gitlab
    tier: postgresql
  namespace: gitlab
spec:
  type: ClusterIP
  selector:
    app: gitlab
    tier: postgresql
  ports:
  - name: postgres
    port: 5432
    targetPort: 5432
EOF
```

检查一下部署的服务：

```bash
$ kubectl -n gitlab get pods,services,endpoints -l app=gitlab,tier=postgresql
NAME                             READY     STATUS    RESTARTS   AGE
po/postgresql-7bdbb599f7-d4dhj   1/1       Running   0          1m

NAME             TYPE        CLUSTER-IP        EXTERNAL-IP   PORT(S)    AGE
svc/postgresql   ClusterIP   172.254.102.241   <none>        5432/TCP   36s

NAME            ENDPOINTS           AGE
ep/postgresql   172.1.74.154:5432   36s
```

### 部署 Gitlab

需要注意的是，`GITLAB_HOST` 是客户端拉取代码时所需要用到的域名或 IP 地址。

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: gitlab
  namespace: gitlab
spec: 
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: gitlab
      tier: gitlab-ce
  template:
    metadata:
      labels:
        app: gitlab
        tier: gitlab-ce
    spec:
      containers:
      - name: gitlab
        image: sameersbn/gitlab:10.5.6
        imagePullPolicy: IfNotPresent
        ports:
        - name: http
          containerPort: 80
        - name: ssh
          containerPort: 22
        env:
        - name: TZ
          value: Asia/Shanghai

        - name: GITLAB_SECRETS_DB_KEY_BASE
          value: long-and-random-alpha-numeric-string
        - name: GITLAB_SECRETS_SECRET_KEY_BASE
          value: long-and-random-alpha-numeric-string
        - name: GITLAB_SECRETS_OTP_KEY_BASE
          value: long-and-random-alpha-numeric-string

        - name: GITLAB_ROOT_PASSWORD
          value: 0p9o8i7u6y
        - name: GITLAB_ROOT_EMAIL
          value: logs@eway.link

        - name: GITLAB_HOST
          value: git.cloud.local
        - name: GITLAB_PORT
          value: "80"
        - name: GITLAB_SSH_PORT
          value: "22"

        - name: GITLAB_NOTIFY_ON_BROKEN_BUILDS
          value: "true"
        - name: GITLAB_NOTIFY_PUSHER
          value: "false"

        - name: GITLAB_BACKUP_SCHEDULE
          value: daily
        - name: GITLAB_BACKUP_TIME
          value: 01:00

        - name: DB_TYPE
          value: postgres
        - name: DB_HOST
          value: postgresql
        - name: DB_PORT
          value: "5432"
        - name: DB_USER
          value: gitlab
        - name: DB_PASS
          value: passw0rd
        - name: DB_NAME
          value: gitlab_production

        - name: REDIS_HOST
          value: redis
        - name: REDIS_PORT
          value: "6379"

        - name: SMTP_ENABLED
          value: "true"
        - name: SMTP_DOMAIN
          value: smtp.qq.com
        - name: SMTP_HOST
          value: smtp.exmail.qq.com
        - name: SMTP_PORT
          value: "25"
        - name: SMTP_USER
          value: logs@eway.link
        - name: SMTP_PASS
          value: Ab123456
        - name: SMTP_STARTTLS
          value: "true"
        - name: SMTP_AUTHENTICATION
          value: login

        - name: IMAP_ENABLED
          value: "false"
        - name: IMAP_HOST
          value: imap.gmail.com
        - name: IMAP_PORT
          value: "993"
        - name: IMAP_USER
          value: mailer@example.com
        - name: IMAP_PASS
          value: password
        - name: IMAP_SSL
          value: "true"
        - name: IMAP_STARTTLS
          value: "false"
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 180
          timeoutSeconds: 5
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 180
          timeoutSeconds: 5
        volumeMounts:
        - name: data
          mountPath: /home/git/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: gitlab-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: gitlab
  labels:
    app: gitlab
    tier: gitlab-ce
  namespace: gitlab
spec:
  type: ClusterIP
  selector:
    app: gitlab
    tier: gitlab-ce
  ports:
  - name: http
    port: 80
    targetPort: http
  - name: ssh
    port: 22
    targetPort: ssh
EOF
```

检查一下部署的服务（等待至少 180s）：

```bash
$ kubectl -n gitlab get pod,service,endpoints -l app=gitlab,tier=gitlab-ce
NAME                        READY     STATUS    RESTARTS   AGE       IP             NODE
po/gitlab-cb9b5d4bd-xthkk   1/1       Running   0          21m       172.1.199.55   kube-node-103

NAME         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)         AGE       SELECTOR
svc/gitlab   ClusterIP   172.254.15.166   <none>        80/TCP,22/TCP   1h        app=gitlab,tier=gitlab-ce

NAME        ENDPOINTS                         AGE
ep/gitlab   172.1.199.55:80,172.1.199.55:22   1h
```

排查一下日志：

```bash
$ kubectl -n gitlab logs -f po/gitlab-cb9b5d4bd-xthkk
```

其中，设置的管理员账号和密码为：`logs@eway.link`/`0p9o8i7u6y`。
另外，

### 外部访问

如果是在公有云上，直接将 Service 部署成 `type: LoadBalancer`，并且 UI 端口设置为 `80或443` 以及 SSH 端口设置为 `22`。如果是在私有云上，建议使用 Ingress 代理 GitLab UI（80 或 443）；如果要代理 SSH 只能改变端口（Nginx Ingress TCP 代理），因为这会与主机默认的 SSH 端口冲突（除非 Nginx Ingress Controller 节点的 SSH 端口不是默认的 `22`）

* Ingress

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: gitlab
  labels:
    app: gitlab
    tier: gitlab-ce
  namespace: gitlab
spec:
  rules:
  - host: git.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: gitlab
          servicePort: 80
EOF
```

* Ingress with TLS（克隆没有测试成功，估计 GitLab 内部还需要使用 HTTPS）

为域名 `git.cloud.local` 生成一个 TLS 证书：

```bash
$ openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout gitlab.key -out gitlab.crt -subj "/CN=git.cloud.local"
```

使用 Secret 存储证书：

```bash
# 这种方式创建的 Secret，其 key 都是 tls.key 和 tls.crt
$ kubectl -n gitlab create secret tls gitlab-cert --key=gitlab.key --cert=gitlab.crt
```

部署 Ingress：

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: gitlab
  labels:
    app: gitlab
    tier: gitlab-ce
  namespace: gitlab
spec:
  tls:
  - hosts:
    - git.cloud.local
    secretName: gitlab-cert
  rules:
  - host: git.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: gitlab
          servicePort: 80
EOF
```

* Nginx Ingress Controller 代理 GitLab SSH

前提：Ningx INgress Controller 节点的默认 SSH 端口不是 `22`。

```bash
$ kubectl get cm tcp-services -o yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tcp-services
  namespaces: ingress-nginx
data:
  "22": gitlab/gitlab:22
```
