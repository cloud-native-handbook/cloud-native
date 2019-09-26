https://github.com/kubernetes/examples/blob/master/mysql-wordpress-pd/local-volumes.yaml

kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: local-fast
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer


https://kubernetes.io/docs/concepts/storage/storage-classes/#persistentvolumeclaims
