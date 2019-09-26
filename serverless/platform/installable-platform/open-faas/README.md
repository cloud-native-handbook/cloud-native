# OpenFaaS

OpenFaas 是一个建立在容器上的 serverless function 框架。

https://blog.alexellis.io/first-faas-python-function/

https://blog.alexellis.io/introducing-functions-as-a-service/


## faas-cli

faas-cli 可以构建和部署 function 到 OpenFaaS，比如写一个 handler.py/handler.js 文件，然后直接封装到 Docker 镜像中。

```bash
# 安装
$ curl -sSL https://cli.openfaas.com | sudo sh

# 创建别名（可选）
$ ln -s /usr/local/bin/{faas-cli,faas}
```

### 主要命令

faas-cli list - 查看 OpenFaaS function
faas-cli new - 通过模板创建一个新的 function
faas-cli build - 从支持的语言类型中构建 Docker 镜像
faas-cli push - 推送 Docker 镜像到镜像仓库
faas-cli deploy - 部署 function 到本地或远程 OpenFaaS 网关
faas-cli remove - 从本地或远程 OpenFaaS 网关中移除 function
faas-cli invoke - invokes the functions and reads from STDIN for the body of the request
faas-cli login - stores basic auth credentials for OpenFaaS gateway (supports multiple gateways)
faas-cli logout - removes basic auth credentials for a given gateway
faas-cli template pull - 从 GitHub 中拉取[模板](https://github.com/openfaas/faas-cli/tree/master/template)


## 部署

### RBAC

```bash
$ wget -O faas-rbac.yaml https://raw.githubusercontent.com/openfaas/faas-netes/master/rbac.yml

# 修改 rbac apiVersion
$ sed -i "s|rbac.authorization.k8s.io/v1beta1|rbac.authorization.k8s.io/v1|g" faas-rbac.yaml
```

### 监控

```bash
$ wget -O faas-monitoring.yaml https://raw.githubusercontent.com/openfaas/faas-netes/master/monitoring.yml

# 修改配置
$ sed -i "s|imagePullPolicy: Always|imagePullPolicy: IfNotPresent|g" faas-monitoring.yaml

$ kubectl apply -f faas-monitoring.yaml
```

### 部署（同步栈）

```bash
$ wget -O faas.yaml https://raw.githubusercontent.com/openfaas/faas-netes/master/faas.yml

# 修改配置
$ sed -i "s|imagePullPolicy: Always|imagePullPolicy: IfNotPresent|g" faas.yaml

# 部署
$ kubectl apply -f faas.yaml

# 检查服务
$ kubectl get svc,deploy,pod -l app=faas-netesd
$ kubectl get svc,deploy,pod -l app=gateway

# 排查日志
$ log
```

### 部署（异步栈）

```bash
$ wget -O faas.async.yaml https://raw.githubusercontent.com/openfaas/faas-netes/master/faas.async.yml

# 修改配置
$ sed -i "s|imagePullPolicy: Always|imagePullPolicy: IfNotPresent|g" faas.async.yaml

# 部署
$ kubectl apply -f faas.async.yaml
```


### faas-rabc.yaml

```yaml
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRole
metadata:
  name: faas-controller
rules:
- apiGroups:
  - ""
  resources:
  - services
  verbs:
  - get
  - list
  - watch
  - create
  - delete
  - update
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - extensions
  resources:
  - deployments
  verbs:
  - get
  - list
  - watch
  - create
  - delete
  - update
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: faas-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: faas-controller
subjects:
- kind: ServiceAccount
  name: faas-controller
  namespace: default
```

### faas.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: faas-netesd
  labels:
    app: faas-netesd
spec:
  type: NodePort
  ports:
  - port: 8080
    protocol: TCP
    targetPort: 8080
    nodePort: 31111
  selector:
    app: faas-netesd
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: faas-controller
---
apiVersion: apps/v1beta1
kind: Deployment
metadata:
  name: faas-netesd
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: faas-netesd
    spec:
      serviceAccountName: faas-controller
      containers:
      - name: faas-netesd
        image: functions/faas-netesd:0.3.4
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
          protocol: TCP
        resources:
          requests:
            memory: 20Mi
          limits:
            memory: 30Mi 
---
apiVersion: v1
kind: Service
metadata:
  name: gateway
  labels:
    app: gateway
spec:
  type: NodePort
  ports:
  - port: 8080
    protocol: TCP
    targetPort: 8080
    nodePort: 31112
  selector:
    app: gateway
---
apiVersion: apps/v1beta1
kind: Deployment
metadata:
  name: gateway
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: gateway
    spec:
      containers:
      - name: gateway
        image: functions/gateway:0.6.14
        imagePullPolicy: Always
        env:
        - name: functions_provider_url
          value: "http://faas-netesd.default.svc.cluster.local:8080/"
        ports:
        - containerPort: 8080
          protocol: TCP
        resources:
          requests:
            memory: 20Mi
          limits:
            memory: 30Mi
```



## 参考

* [faas-netes](https://github.com/openfaas/faas-netes)
* [Deployment guide for Kubernetes](https://github.com/openfaas/faas/blob/master/guide/deployment_k8s.md)
