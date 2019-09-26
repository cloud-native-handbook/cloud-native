# Pod 资源限制

* CPU
* Memory
* GPU

## 资源限制

Kubernetes 通过 cgroups 限制容器的 CPU 和内存等计算资源，包括 requests（请求，调度器确保调度到资源充足的 Node 上）和 limits（上限）等：

  * spec.containers[].resources.limits.cpu：CPU 上限，可以短暂超过，容器也不会被停止；
  * spec.containers[].resources.limits.memory：内存上限，不可以超过；如果超过，容器可能会被停止或调度到其他资源充足的机器上；
  * spec.containers[].resources.requests.cpu：CPU 请求，可以超过；
  * spec.containers[].resources.requests.memory：内存请求，可以超过；但如果超过，容器可能会在 Node 内存不足时清理。

比如 nginx 容器请求 30% 的 CPU 和 56MB 的内存，但限制最多只用 50% 的 CPU 和 128MB 的内存：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:1.11.9-alpine
    resouces:
      requests:
        cpu: "300m"
        memory: "56Mi"
      limits:
        cpu: "500m"
        memory: "128Mi"
```

注意，CPU 的单位是 milicpu，500mcpu=0.5cpu；而内存的单位则包括 E, P, T, G, M, K, Ei, Pi, Ti, Gi, Mi, Ki等。
