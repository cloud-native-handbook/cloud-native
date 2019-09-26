# 安装 Minishift

## 前提条件

<!--
Minishift requires a hypervisor to start the virtual machine on which the OpenShift cluster is provisioned. Verify that the hypervisor of your choice is installed and enabled on your system before you set up Minishift. Once the hypervisor is up and running, additional setup is required for Minishift to work with that hypervisor.
-->

Minishift 需要一个 hypervisor 来启动虚拟机，用于部署 OpenShift 集群。

推荐的 hypervisor:

* **macOS**
  * xhyve
* **Linux**
  * KVM
* **Windows**
  * Hyper-V
* **所有平台**
  * VirtualBox

## 设置虚拟环境

### KVM（默认）

1. 安装 **libvirt** 和 **qemu-kvm**

```bash
$ apt-install libvirt-bin qemu-kvm
```

### VirtualBox

设置默认的 VM Driver:

```bash
$ minishift config set vm-driver virtualbox
```

## 下载 Minishift

```bash
# Linux
$ ms_version=1.16.1
$ curl -sL https://github.com/minishift/minishift/releases/download/v${ms_version}/minishift-${ms_version}-linux-amd64.tgz | tar -zxv
$ sudo mv minishift-${ms_version}-linux-amd64/minishift /usr/local/bin/

# 验证
$ minishift version
minishift v1.16.1+d9a86c9
```

## 启动 Minishift

1. 首次启动会安装一个 "oc" 客户端工具和 [minishift-b2d-iso](https://github.com/minishift/minishift-b2d-iso/releases) 文件。

```bash
# VirtualBox Hyptervisor
$ minishift start --vm-driver virtualbox

$ minishift status
Minishift:  Running
Profile:    minishift
OpenShift:  Running (openshift v3.9.0+d0f9aed-12)
DiskUsage:  16% of 17.9G
```

2. 运行 `minishift oc-env` 命令查看将 `oc` 二进制添加到 `PATH` 环境变量的命令。

```bash
$ minishift oc-env
export PATH="/home/yin/.minishift/cache/oc/v3.9.0/linux:$PATH"
# Run this command to configure your shell:
# eval $(minishift oc-env)

$ eval $(minishift oc-env)

# 验证 API Server 是否可以正常访问
$ oc version
oc v3.9.0+191fece
kubernetes v1.9.1+a0ce1bc657
features: Basic-Auth GSSAPI Kerberos SPNEGO

Server https://192.168.99.100:8443
openshift v3.9.0+d0f9aed-12
kubernetes v1.9.1+a0ce1bc657
```

这种方式添加的 `oc` 环境变量依然是只针对当前终端环境有效，如果希望每次打开终端都有效，可以将 `eval $(minishift oc-env)` 添加到 `~/.bashrc`。

```bash
$ echo 'eval $(minishift oc-env)' >> ~/.bashrc
$ source ~/.bashrc
```

登录：

```bash
# 作为开发人员登录
$ oc login --username developer --passowrd <any value>

# 作为管理员登录
$ oc login -u system:admin
```

## 配置 Minishift

## 部署示例

下面展示一下如何使用命令行部署一个简单的 Node.js 应用。

1. 创建 Node.js 示例应用

```bash
$ oc new-app https://github.com/openshift/nodejs-ex -l name=myapp
```

2. 追踪构建日志，直到应用程序构建且部署完成

```bash
$ oc logs -f bc/nodejs-ex
```

3. 暴露一个路由到该 Service

```bash
$ oc expose svc/nodejs-ex

$ oc get route
NAME        HOST/PORT                                   PATH      SERVICES    PORT       TERMINATION   WILDCARD
nodejs-ex   nodejs-ex-myproject.192.168.99.100.nip.io             nodejs-ex   8080-tcp                 None
```

4. 访问应用程序

```bash
$ minishift openshift service nodejs-ex --in-browser
```
