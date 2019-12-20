# Kubernetes 资源对象之 PersistentVolume（PV）

## 回收策略（`.spec.persistentVolumeReclaimPolicy`）

| 回收策略  | 描述                                                              |
| --------- | ----------------------------------------------------------------- |
| `Retain`  | 手动回收                                                          |
| `Recycle` | 擦除（`rm -rf /thevolume/*`）；仅 NFS 和 HostPath 支持            |
| `Delete`  | 关联的存储会被删除；仅 AWS EBS，GCE PD，Azure Disk 和 Cinder 支持 |

* Retain: 手动回收；
* Recycle: 擦除（`rm -rf /thevolume/*`）；仅 NFS 和 HostPath 支持；
* Delete: 关联的存储会被删除；仅 AWS EBS，GCE PD，Azure Disk 和 Cinder 支持。

> https://v1-8.docs.kubernetes.io/docs/concepts/storage/persistent-volumes/#reclaim-policy
> https://v1-8.docs.kubernetes.io/docs/concepts/storage/persistent-volumes/#reclaiming


## 访问模式（`.spec.accessModes`）

| 模式            | 描述 |
| --------------- | ---- |
| `readWriteOnce` |      |
| `readOnlyMany`  |      |
| `readWriteMany` |      |

  * readwriteonce - 仅支持单一节点对卷进行读写操作
  * readonlymany - 支持多个节点读操作和单一节点写操作
  * readwritemany - 支持多个节点同时进行读写操作

Kubernetes 原生支持GCE持久化卷和AWS的弹性块存储


## 创建 PV

```bash
$ cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: storage-pv
  labels:
    type: storage
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: /data/storage
EOF
```

## 节点亲和力（`.spec.nodeAffinity`）


## 参考

* [Kubernetes 存储机制的实现](https://www.kubernetes.org.cn/1811.html)

https://kubernetes.io/docs/concepts/storage/persistent-volumes/
