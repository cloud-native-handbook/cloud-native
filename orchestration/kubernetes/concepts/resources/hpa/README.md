# Horizontal Pod Autoscaling (HPA)

`HPA` 用于实现 Pod 的水平自动扩容，仅限于 `Deployment` 和 `ReplicationController` 两种资源对象。

## API Version

| API 版本            | K8s 版本 |
| ------------------- | -------- |
| autoscaling/v2beta1 |          |


## 扩容方式

### 手动扩容

```bash
$ kubectl scale deployment/nginx-deploy --replicas=2
```

### CPU 使用率

```bash
$ kubectl autoscale deployment/nginx-deploy --min=1 --max=20 --cpu-percent=80
```

### 内存使用率

```bash
apiVersion: autoscaling/v2beta1
kind: HorizontalPodAutoscaler
metadata:
  name: mem-db-scaler
spec:
  scaleTargetRef:
    kind: Deployment
    name: mem-db
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: memory
      targetAverageValue: 1G
```

> https://blog.openshift.com/kubernetes-1-8-now-custom-metrics/


## 参考

* [Kubernetes HPA Controller 工作原理](http://blog.csdn.net/waltonwang/article/details/69359692)
