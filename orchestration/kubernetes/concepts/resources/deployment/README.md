# Kubernetes 资源对象之 Deployment

我们用 _Pod_ 对象创建的 Pod，在 Pod 的容器终止时不会自动重启。

## API 版本

| K8s 版本       | API 版本           |
| -------------- | ------------------ |
| ~              | extensions/v1beta1 |
| v1.15 ~ latest | apps/v1            |

## 扩容、缩容

* 部署 Deployment

```bash
$ kubectl run nginx-deploy --image=nginx:alpine --port=80
```

* 手动扩容

```bash
$ kubectl scale deployment/nginx-deploy --replicas=2
```

* HPA 自动水平扩容

```bash
$ kubectl autoscale deployment/nginx-deploy --min=1 --max=20 --cpu-percent=80
```

* 更新镜像

```bash
$ kubectl set deployment/nginx-dm --image=nginx:latest
```

## 滚动升级

### 升级方式

* 更新容器镜像

```bash
# 方式一（第二个 nginx-deploy 为容器名）
$ kubectl set image deployment/nginx-deploy nginx-deploy=nginx:latest --record=true

# 方式二
$ kubectl patch deployment/nginx-deploy -p '{"spec": {"template": {"spec": {"containers": [{"name": "nginx-deploy", "image": "nginx:latest"}]}}}}'
```

更新容器镜像为最新镜像：

```bash
# https://akomljen.com/kubernetes-tips-part-1/
$ kubectl scale --replicas=0 deploy/my-app && kubectl scale --replicas=1 deploy/my-app
```

* 更新资源限制

```bash
$ kubectl set resources deployment/nginx-deploy --requests=cpu=100m,memory=128Mi --limits=cpu=200m,memory=192Mi --record=true
```

### 滚动操作

```bash
# 滚动状态
$ kubectl rollout status deployment/nginx-deploy

# 滚动历史
$ kubectl rollout history deployment/nginx-deploy
$ kubectl rollout history deployment/nginx-deploy --revision=2

# 回滚到一个版本
$ kubectl rollout undo deployment/nginx-deploy

# 回滚到指定版本
$ kubectl rollout undo deployment/nginx-deploy --to-revision=2
```

### 滚动变化

* ReplicaSet

通过 `更新容器镜像` 或者 `更新资源限制` 升级 Deployment 后，会创建新的 ReplicaSet，并逐次将新的 ReplicaSet 实例增加到目标数量，而将旧的 ReplicaSet 实例减少到零。

```bash
$ kubectl describe deployment/nginx-deploy
$ kubectl get rs -w -l run=nginx-deploy
```

* Deployment

```bash
$ kubectl get deployment -w -l run=nginx-deploy
```

### strategy

`.spec.strategy` 用于指定替换旧 Pod 的策略，可选类型：`Recreate`、`RollingUpdate`。

* Recreate

`.spec.strategy.type==Recreate`，在新 Pod 被创建之前所有旧 Pod 都会被删除。

* RollingUpdate（默认）

`.spec.strategy.type==RollingUpdate`，通过滚动更新的方式更新 Pod。可以指定 `maxUnavailable` 和 `maxSurge` 来控制滚动更新过程。

`.spec.strategy.rollingUpdate.maxUnavailable`（可选字段），用于指定更新过程中最大不可用的 Pod 数量，默认值 `25%`（也可以是绝对数量）。
`.spec.strategy.rollingUpdate.maxSurge`（可选字段），用于指定更新过程中可以超过期望 Pod 数量的最大数量，默认值 `25%`（四舍五入）。

即：

在 Deployment rollout 时，需要保证Available(Ready) Pods数不低于 `desired pods number - maxUnavailable`; 保证所有的Pods 的总数不多于 `desired pods number + maxSurge`。

默认设置：

```yaml
spec:
  minReadySeconds: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
```

对于只有一个副本的应用程序，如果使用默认配置可能导致更新过程中服务中断（即仅有的一个旧 Pod 被删除），可以按下面的方式进行设置。不过这里需要额外注意的是，如果你的应用程序还挂载了 PVC 且它的访问模式为 `ReadWriteOnce`，可能会有些问题（我目前还没有完全测试过，好像有时又是可以的）。

```yaml
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

<!--

## Todo

* 目录
* 升级策略
  * 滚动升级/RollingUpdate
  * 重建/Recreate
* 更新镜像：
  * kubectl apply -f
  * kubectl set image
  * kubectl edit
-->



## 参考

* [Kubernetes Deployment 滚动更新场景分析](http://blog.csdn.net/waltonwang/article/details/77826095)
* [聊聊你可能误解的 Kubernetes Deployment 滚动更新机制](http://blog.csdn.net/waltonwang/article/details/77461697)
