# Ceph RBD 用户指南

## ceph 管理员

* 创建存储池

```bash
$ ceph osd pool create kube 8 8
```

* 添加用户并授权

不需要 Ceph 管理员权限，仅用于映射 rbd 镜像。

```bash
$ ceph auth get-or-create client.kube mon 'allow r' osd 'allow class-read object_prefix rbd_children, allow rwx pool=kube'
```

* 获取 keyring （base64 编码）

```bash
$ ceph auth get-key client.kube
AQBFCF9a+dLaHBAA4yKqIhMYoT4DmAWnG08XFA==

$ ceph auth get-key client.kube | base64
QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
```

## k8s 用户

为了使用 Ceph RBD 资源，每个用户命名空间都要创建一个 `k8s 用户` 的 Secret 来存储 keyring 信息。

```bash
# k8s 用户命名空间
$ kubectl create namespace userns

# 每个用户命名空间必须创建同名的 Secret
$ cat <<EOF | kubectl -n userns apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: ceph-secret-kube
type: kubernetes.io/rbd
data:
  key: QVFCRkNGOWErZExhSEJBQTR5S3FJaE1Zb1Q0RG1BV25HMDhYRkE9PQ==
EOF

# 同上，不同的是不需要先转为 base64 编码
$ kubectl create secret generic ceph-secret-kube \
  --type="kubernetes.io/rbd" \
  --from-literal=key='AQBFCF9a+dLaHBAA4yKqIhMYoT4DmAWnG08XFA==' \
  --namespace=userns
```

## 指南

* [ceph rbd](../volumes/ceph/rbd/README.md)
