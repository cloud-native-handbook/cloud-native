# Kubernetes 资源对象之 List

```bash
# 貌似有不是一个资源对象，gan
$ kubectl get list # 报错
```

```bash
$ kubectl get all -o yaml
```

## 示例

```yaml
apiVersion: v1
kind: List
metadata:
  name: apps
items:
- apiVersion: v1
  kind: Secret
  metadata:
    name: ceph-secret-kube
  type: ceph.com/rbd
  data:
    key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
```
