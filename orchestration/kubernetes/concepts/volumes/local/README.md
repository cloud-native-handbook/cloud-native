# local 存储卷

local 存储卷仍然受限于底层节点的可用性，并且不适用于所有应用程序。如果节点出现故障（比如网络不通），local 卷也将无法访问，并且原本调度到该节点的 Pod 也将无法运行。因此，使用 local 存储卷的应用程序必须能够容忍节点故障而降低的可用性以及潜在的数据丢失，具体取决于底层磁盘的持久性特征。

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: example-pv
spec:
  capacity:
    storage: 100Gi
  # volumeMode field requires BlockVolume Alpha feature gate to be enabled.
  volumeMode: Filesystem
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-storage
  local:
    path: /mnt/disks/ssd1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - example-node
```
