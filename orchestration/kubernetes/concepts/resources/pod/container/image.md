# Pod 容器镜像

## 镜像拉取/更新策略（ImagePullPolicy）

| spec.containers[].imagePullPolicy | 描述                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `IfNotPresent`                    | 默认策略；只有目标 Node 存在该镜像，kubelet 才会拉取镜像（校验镜像的 MD5 变化来判断） |
| `Alway`                           | 无论目标 Node 是否存在该镜像，kubelet 总是拉取镜像                                    |
| `Never`                           | 无论目标 Node 是否存在该镜像，kubelet 都不会拉取镜像，即总是使用目标 Node 上的镜像    |

与 `imagePullPolicy:Always` 相同的情况：

* 省略 `imagePullPolicy` 且镜像 tag 使用 `:latest`
* 省略 `imagePullPolicy` 和镜像的 tag
* 开启 AlwaysPullImages 注入控制器

## 私有镜像（ImagePullSecrets）

容器使用私有镜像时，需要为此创建一个拉取凭证（_Docker Registry Secret_）。

* 创建 _Docker Registry Secret_

使用命令：

```bash
# 创建 docker registry secret
$ kubectl -n awesome create secret docker-registry <NAME> \
  --docker-server=<DOCKER_REGISTRY_SERVER> \
  --docker-username=<DOCKER_USER> \
  --docker-password=<DOCKER_PASSWORD> \
  --docker-email=<DOCKER_EMAIL>
```

使用 manifest：

```yaml
$ kubectl create -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
    name: <name>
    namespace: awesome
spec:
EOF
```

* Pod 中使用该 _Docker Registry Secret_：

通过 manifest：

```yaml
apiVersion: v1
kind: Pod
metadata:
    name: <name>
    namespace: awesome
spec:
  containers:
  - name: <container_name>
    image: <private.domain/image:tag>
  imagePullSecrets:
  - name: <secret_name>
```

通过修改 `default` ServiceAccount：

```sh
$ kubectl -n awesome edit sa/default
```

## 参考

* [Container images](https://kubernetes.io/docs/concepts/containers/images/)
