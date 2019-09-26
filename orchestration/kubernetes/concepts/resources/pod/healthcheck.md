# Pod 容器健康检查

* `spec.containers[].livenessProbe`
* `spec.containers[].readinessProbe`

Kubernetes 提供了两种探针（Probe）来检查容器的健康状态，每种探针均支持 `exec`、`tcpSocket`、`http` 三种方法。

| 探针                       | 描述                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 存活探针（LivenessProbe）  | 检查容器是否处于健康状态，若重试 N 次依然不健康将删除该容器并重新创建                                                   |
| 就绪探针（ReadinessProbe） | 检查容器是否处于可对外提供服务的状态，如果正常则会添加到 Service 关联的 Endpoints 中，否则将不会接收来自 Service 的流量 |

| Method    | 描述                                                 | 示例      |
| --------- | ---------------------------------------------------- | --------- |
| `exec`    | 执行 shell 命令，如果返回值为 `0` 表明检查结果为失败 | `ls /tmp` |
| `httpGet` |                                                      |           |

## 疑问

使用 _Pod_ 对象创建 Kubernetes Pod 时，会进行健康检查，但是当 Pod 容器终止时不会重新创建，因此需要使用 Deployment 等控制器。

## LivenessProbe 和 ReadinessProbe

`LivenessProbe` 用于探测 pod 是否存活，如果探测失败会根据 restartPolicy 来判断是否重启。

`ReadinessProbe` 用于探测 pod 是否就绪，只有处于就绪状态的 pod， 其 endpoint 才会被添加到 service 的 endpoints 中，此时 pod 才会接收来自 service 的流量请求。可以通过 `kubectl get pod <pod-name>` 中的 READY 列来检查容器是否已经就绪；或者如果为 pod 创建了 service，可以通过 `kubectl describe service <service-name> | grep Endpoints` 来检查 pod 的 endpoint 是否添加到了 service 的 endpoints 中，以此来判断 pod 是否就绪。

initialDelaySeconds: 执行首次探测需要等待的时间，单位秒（s）。

livenessProbe[].timeoutSeconds：执行健康检查之后等待响应的超时时间，默认 1 秒，如果超时则认为该容器 `以及所属 pod` 不健康，kubelet 会根据 spec.restartPolicy 来判断是否重启。

readinessProbe[].timeoutSeconds：执行就绪探测之后等待响应的超时时间，默认 1 秒，如果超时则不会将其 endpoint 添加到 service enpoints 中（前提是创建了相关联的 service）。

periodSeconds: 首次探测后再次执行探测的时间周期，默认 10 秒探测一次。

## 健康检查、就绪检查

Kubernetes 为容器提供了两种探针（Probe）：
  * livenessProbe: 提供健康检查，kubelet 使用该探针来决定何时重启容器；
  * readinessProbe: 提供就绪检查，kubelet 使用该探针来决定何时准备接收来自 Service 的流量请求。

> https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/

举一个例子，同时概括了 httpGet、tcpSocket、exec 的 livenessProbe 和 readinessProbe。

默认情况下，如果 LivenessProbe 和/或 ReadinessProbe 没有被指定，则默认使用 `command` 和/或 `args` 的状态返回码作为两者的探测结果。所以如果指定 `command` 和/或 `args` 参数，可以根据自己的需求考虑不指定 LivenessProbe 和/或 ReadinessProbe。

Probe 的缺点是不能同时使用多个健康检查，比如你不能既使用 `httpGet` 又使用 `execSocket`、或者使用两个 `httpGet`，如果有这样的需求，建议自己写个健康检查脚本进行联合。


为了确保容器在部署后确实处在正常运行状态，Kubernetes 提供了两种探针（Probe，支持 exec、tcp 和 httpGet 方式）来探测容器的状态：

  * LivenessProbe：探测应用是否处于健康状态，如果不健康则删除重建容器；
  * ReadinessProbe：探测应用是否启动完成并且处于正常服务状态，如果不正常则更新容器的状态。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  containers:
  - image: nginx
    imagePullPolicy: Always
    name: http
    livenessProbe:
      httpGet:
      path: /
      port: 80
      initialDelaySeconds: 15
      timeoutSeconds: 1
    readinessProbe:
      httpGet:
      path: /ping
      port: 80
      initialDelaySeconds: 5
      timeoutSeconds: 1
```

## 小实验
