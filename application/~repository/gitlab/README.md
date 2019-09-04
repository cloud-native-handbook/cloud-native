# GitLab


## 访问

默认的管理员用户名和密码为 `root`（别名为 `Administrator`，但不能用于登录）/`5iveL!fe`，首次登录需要会提示你修改管理员密码。


## GitLab CE

```bash
$ kubectl apply -f gitlab.namespace.yaml
$ kubectl apply -f ceph-secret-kube.secret.gitlab.yaml

$ kubectl apply -f gitlab-config.cm.gitlab.yaml
$ kubectl apply -f gitlab-ce.deploy+pvc.gitlab.yaml

$ kubectl apply -f gitlab-ce.svc+ing.gitlab.yaml
```

## 部署

### 创建命名空间以及 ceph secret

```bash
$ kubectl create namespace gitlab
```

```bash
$ cat <<EOF | kubectl -n gitlab apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF
```

### 部署 PostgreSQL

需要有个默认 StorageClass。

```bash
$ cat <<EOF | kubectl -n gitlab apply -f -
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  labels:
    app: gitlab
spec:
  ports:
  - port: 5432
  selector:
    app: gitlab
    tier: postgreSQL
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-claim
  labels:
    app: gitlab
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: postgresql
  labels:
    app: gitlab
spec:
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: gitlab
        tier: postgreSQL
    spec:
      containers:
        - image: postgres:9.6.2-alpine
          name: postgresql
          env:
            - name: POSTGRES_USER
              value: gitlab
            - name: POSTGRES_DB
              value: gitlabhq_production
            - name: POSTGRES_PASSWORD
              value: gitlab
          ports:
            - containerPort: 5432
              name: postgresql
          volumeMounts:
            - name: postgresql
              mountPath: /var/lib/postgresql:rw
      volumes:
        - name: postgresql
          persistentVolumeClaim:
            claimName: postgres-claim
EOF
```

* 部署 Redis

```bash
$ cat <<EOF | kubectl -n gitlab apply -f -
apiVersion: v1
kind: Service
metadata:
  name: redis
  labels:
    app: gitlab
spec:
  ports:
    - port: 6379
      targetPort: 6379
  selector:
    app: gitlab
    tier: backend
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-claim
  labels:
    app: gitlab
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: redis
  labels:
    app: gitlab
spec:
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: gitlab
        tier: backend
    spec:
      containers:
        - image: redis:3.0.7-alpine
          name: redis
          ports:
            - containerPort: 6379
              name: redis
          volumeMounts:
            - name: redis
              mountPath: /var/lib/redis:rw
      volumes:
        - name: redis
          persistentVolumeClaim:
            claimName: redis-claim
EOF
```

检查：

```bash
$ kubectl -n gitlab get pod,pvc
```

* 部署 GitLab

```bash
$ cat <<EOF | kubectl -n gitlab apply -f -
apiVersion: v1
kind: Service
metadata:
  name: gitlab
  labels:
    app: gitlab
spec:
  type: ClusterIP
  ports:
  - name: gitlab-ui
    port: 80
    targetPort: gitlab-ui
    protocol: TCP
  - name: gitlab-ssh
    port: 22
    targetPort: gitlab-ssh
    protocol: TCP
  selector:
    app: gitlab
    tier: frontend
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: gitlab-claim
  labels:
    app: gitlab
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: gitlab
  labels:
    app: gitlab
spec:
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: gitlab
        tier: frontend
    spec:
      containers:
        - image: gitlab/gitlab-ce:9.1.0-ce.0
          name: gitlab
          env:
            - name: GITLAB_OMNIBUS_CONFIG
              value: |
                postgresql['enable'] = false
                gitlab_rails['db_username'] = "gitlab"
                gitlab_rails['db_password'] = "gitlab"
                gitlab_rails['db_host'] = "postgresql"
                gitlab_rails['db_port'] = "5432"
                gitlab_rails['db_database'] = "gitlabhq_production"
                gitlab_rails['db_adapter'] = 'postgresql'
                gitlab_rails['db_encoding'] = 'utf8'
                redis['enable'] = false
                gitlab_rails['redis_host'] = 'redis'
                gitlab_rails['redis_port'] = '6379'
                gitlab_rails['gitlab_shell_ssh_port'] = 22
                external_url 'http://gitlab.cloud.local:80'
          ports:
          # 和 external_url 的端口一致
          - containerPort: 80
            name: gitlab-ui
          # 和 gitlab_rails['gitlab_shell_ssh_port'] 端口一致
          - name: gitlab-ssh
            containerPort: 22
          volumeMounts:
            - name: gitlab
              mountPath: /home/git/data:rw
      volumes:
        - name: gitlab
          persistentVolumeClaim:
            claimName: gitlab-claim
---
apiVersion: batch/v1
kind: Job
metadata: {name: kubernetes-containter-service-gitlab-sample-metrics}
spec:
  template:
    metadata: {name: kubernetes-container-service-gitlab-sample-metrics}
    spec:
      containers:
        - env:
            - {name: config, value: '{"event_id": "web",
                "repository_id": "Kubernetes-container-service-Gitlab-sample",
                "target_services": ["Compose for PostgreSQL"],
                "target_runtimes": ["Kubernetes Cluster"],
                "event_organizer": "dev-journeys"}'}
            - {name: language, value: ''}
          image: journeycode/kubernetes:latest
          name: kubernetes-container-service-gitlab-sample-metrics
          resources:
            limits: {cpu: 100m}
      restartPolicy: Never
EOF
```

```bash
$ sed -i "s|gitlab.example.com:|gitlab.cloud.local|g" gitlab-ce.yaml
```

* Ingress

```bash
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: gitlab
  namespace: gitlab
  labels:
    name: gitlab
spec:
  rules:
  - host: git.example.com
    http:
      paths:
      - path: /
        backend:
          serviceName: gitlab
          servicePort: 80
  - host: git-ssh.example.com
    http:
      paths:
      - path: /
        backend:
          serviceName: gitlab
          servicePort: 1022
```

```bash
$ cat <<EOF | kubectl -n gitlab apply -f -
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: gitlab
  namespace: gitlab
spec:
  rules:
  - host: gitlab.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: gitlab
          servicePort: gitlab-ui
  - host: gitlab-ssh.cloud.local
    http:
      paths:
      - path: /
        backend:
          serviceName: gitlab
          servicePort: gitlab-ssh
EOF
```


## 使用 Helm 部署




## 访问

浏览器首次打开 `http://gitlab-ce.gitlab.svc.cluster.local/` 时需要设置一个管理员密码，默认的管理员用户名为 `root`。


## 参考

* [Installing GitLab on Kubernetes](https://docs.gitlab.com/ce/install/kubernetes/)


* [sameersbn/docker-gitlab](https://github.com/sameersbn/docker-gitlab/tree/master/kubernetes)

* [HOW TO EASILY DEPLOY GITLAB ON KUBERNETES](http://blog.lwolf.org/post/how-to-easily-deploy-gitlab-on-kubernetes/)
* [lwolf/kubernetes-gitlab](https://github.com/lwolf/kubernetes-gitlab)
* [gitlab.rb.template](https://gitlab.com/gitlab-org/omnibus-gitlab/blob/master/files/gitlab-config-template/gitlab.rb.template)

* [Deploy a distributed GitLab leveraging Kubernetes and Docker](https://developer.ibm.com/code/patterns/run-gitlab-kubernetes/)

* [GitLab deployment on Kubernetes Cluster](https://github.com/IBM/Kubernetes-container-service-GitLab-sample/blob/master/README-cn.md)