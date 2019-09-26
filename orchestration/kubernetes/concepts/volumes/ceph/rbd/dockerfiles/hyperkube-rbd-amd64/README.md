# kube-controller-manager 支持 Ceph

如果集群是容器化部署的，会存在 `kube-controller-manager` 无法调用 rbd 接口访问 Ceph 集群，从而创建 volume 失败，原因是镜像中没有安装 `ceph-common` 包。


## 构建

由于官方提供的 `gcr.io/google-containers/kube-controller-manager-amd64` 镜像没有包管理器，所以选择了 `hyperkube` 作为基础镜像。

```bash
$ docker build --rm --build-arg CEPH_VERSION="jewel" --build-arg CEPH_VERSION="10.2.9" \
  --build-arg KUBE_VERSION="v1.8.2" -t dockerce/kube-controller-manager-rbd-amd64:v1.8.2 -f Dockerfile .

# 修改 kube-controller-manager Staic Pod 的镜像（会自动重启）
$ sed -i "s|image:.*|image: dockerce/hyperkube-rbd-amd64:v1.8.2|g" /etc/kubernetes/manifests/kube-controller-manager.yaml
```
