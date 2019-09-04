# Secret

## 

```bash
$ # 去除换行符
$ echo "admin" | base64 | tr -d '\n'
YWRtaW4K

$ # 解码
$ echo "YWRtaW4K" | base64 -d | tr -d '\n'
```

## Pod 自动引用 imagePullSecret

> https://kubernetes.io/docs/concepts/containers/images/#referring-to-an-imagepullsecrets-on-a-pod
> https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#add-imagepullsecrets-to-a-service-account

对于一些公用的镜像，大多数租户（一个租户一个命名空间）没有必要每次拉取镜像都指定一个 imagePullSecret。为了实现这个自动化操作，可以在每次创建 Namespace 的时候，在自动创建的 `default` ServiceAccount 上再绑定一个 imagePullSecret（Pod 创建的时候会自动绑定 `default` 服务账号）。这样，该命名空间下创建的所有 Pod 都会自动引用该 imagePullSecret。

```bash
$ # 创建命名空间 myns
$ kubectl create namespace myns

$ # 创建 imagePullSecret
$ kubectl -n myns create secret docker-registry common-registry-key --docker-server=DOCKER_REGISTRY_SERVER --docker-username=DOCKER_USER --docker-password=DOCKER_PASSWORD --docker-email=DOCKER_EMAIL

$ # 添加 imagePullSecret 到 "default" 服务账号
$ kubectl -n myns patch sa default -p '{"imagePullSecrets": [{"name": "common-registry-key"}]}'

$ # 验证
$ kubectl -n myns get sa default -o yaml
apiVersion: v1
imagePullSecrets:
- name: common-registry-key
kind: ServiceAccount
metadata:
  ...
secrets:
- name: default-token-t1ncj

$ # 测试 Pod 是否可以正常创建（测试的前提是 "youraccount/yourimage:1.0" 镜像必须要通过 auth 才能下载）
$ cat <<EOF | kubectl -n myns create -f -
apiVersion: v1
kind: Pod
metadata:
  name: mypod
spec:
  containers:
  - name: mypod
    image: youraccount/yourimage:1.0
    imagePullPolicy: Always
    ports:
    - name: http
      containerPort: 80
EOF

$ # "common-registry-key" 被自动添加到了 Pod 中
$ kubectl -n myns get pod mypod -o yaml | grep imagePullSecrets -A 1
  imagePullSecrets:
  - name: common-registry-key
```
