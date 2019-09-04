# 部署 Harbor

## 部署

* 下载

```bash
$ git clone https://github.com/vmware/harbor.git

# 创建新分支并指向 v1.4.0 tag
$ cd harbor && git checkout -b v1.4.0 v1.4.0
```

* 修改 harbor.cfg

```bash
# 设置用于访问 UI 和 Registry 服务的 IP 或域名
$ harbor_hostname="harbor.cloud.local"

$ sed -i "s|hostname = .*|hostname = $harbor_hostname|g" make/harbor.cfg
```

* 生成配置

```bash
# python 2.6 以上
$ python make/kubernetes/k8s-prepare -f make/harbor.cfg
```