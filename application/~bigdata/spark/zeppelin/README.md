# 部署

```bash
$ # 创建 spark 命名空间
$ kubectl create -f spark.namespace.yaml

$ # 创建 Secret
$ kubectl create -f rbd-secret-admin.secret.spark.yaml

$ # 方案一
$ kubectl create -f zeppelin.statefulset.spark.yaml

$ # 方案二
$ kubectl create -f zeppelin.deployment_and_pvc.spark.yaml

$ # 创建 Service
$ kubectl create -f zeppelin.service.spark.yaml
```