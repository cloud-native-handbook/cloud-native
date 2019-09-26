# Error pulling Docker image

## 问题

初次启动 OpenShift 时遇到无法拉取 Docker 镜像的问题：

```bash
$ minishift start --vm-driver virtualbox
-- Starting profile 'minishift'
-- Checking if https://github.com is reachable (using proxy: "No") ... OK
-- Checking if requested OpenShift version 'v3.9.0' is valid ... OK
-- Checking if requested OpenShift version 'v3.9.0' is supported ... OK
-- Checking if requested hypervisor 'virtualbox' is supported on this platform ... OK
-- Checking if VirtualBox is installed ... OK
-- Checking the ISO URL ... OK
-- Checking if provided oc flags are supported ... OK
-- Starting local OpenShift cluster using 'virtualbox' hypervisor ...
-- Minishift VM will be configured with ...
   Memory:    2 GB
   vCPUs :    2
   Disk size: 20 GB
-- Starting Minishift VM .........................-- Setting proxy information ... OK
 OK
-- Checking for IP address ... OK
-- Checking for nameservers ... OK
-- Checking if external host is reachable from the Minishift VM ...
   Pinging 8.8.8.8 ... OK
-- Checking HTTP connectivity from the VM ...
   Retrieving http://minishift.io/index.html ... OK
-- Checking if persistent storage volume is mounted ... OK
-- Checking available disk space ... 0% used OK
   Importing 'openshift/origin:v3.9.0'  CACHE MISS
   Importing 'openshift/origin-docker-registry:v3.9.0'  CACHE MISS
   Importing 'openshift/origin-haproxy-router:v3.9.0'  CACHE MISS
-- OpenShift cluster will be configured with ...
   Version: v3.9.0
Pulling image openshift/origin:v3.9.0
error: FAIL
   Error: error pulling Docker image openshift/origin:v3.9.0
   Caused By:
     Error: Error: No such image: openshift/origin:v3.9.0
Error during 'cluster up' execution: Error starting the cluster.
```

## 解决办法

1. 删除旧的 OpenShift VM

```bash
$ minishift delete
```

2. 设置/改变 Registry Mirror

```bash
$ minishift start --vm-driver virtualbox --registry-mirror https://registry.docker-cn.com
# or
$ minishift start --vm-driver virtualbox --docker-opt registry-mirror=https://registry.docker-cn.com
```

3. 取消本地代理

如果在宿主机上设置了本地代理（通过环境变量），代理环境变量会被植入到 OpenShift VM 中，导致 VM 中无法拉取镜像。

```bash
# 查看宿主机是否设置了本地代理
$ env | grep -i proxy
NO_PROXY=localhost,127.0.0.0/8,::1
http_proxy=http://127.0.0.1:1080/
no_proxy=localhost,127.0.0.0/8,::1

# 如果有本地代理，必须取消
$ unset $(env | grep -i "proxy" | awk -F "=" '{print $1}')
```
