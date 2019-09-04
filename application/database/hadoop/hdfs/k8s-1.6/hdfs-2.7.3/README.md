# 部署

```bash
$ # 检查 StorageClass 是否存在
$ kubectl get storageclass | grep rbd

$ kubectl create -f hadoop.namespace.yaml

$ kubectl create -f rbd.secret.admin.hadoop.yaml

$ kubectl create -f namenode.statefulset.hadoop.yaml

$ kubectl create -f namenode.service.hadoop.yml

$ kubectl create -f datanode.statefulset.hadoop.yaml

$ # 可有可无
$ kubectl create -f datanode.service.hadoop.yaml
```

## 参考资料

* [flokkr/runtime-kubernetes](https://github.com/flokkr/runtime-kubernetes)