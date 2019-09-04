# GPU 调度

## 安装 CUDA 工具包和驱动

CUDA 是英伟达创造的并行计算平台和编程模型。它利用图像处理器（GPU）能力，实现计算性能的显著提高。即支持 CUDA 的 GPU 可以使用其加速计算。支持 CUDA 的 GPU 拥有数百个核心，可以共同运行数千个计算线程。

### 系统要求

CUDA 9.1 支持的系统环境（x86_64）

| Linux 发行版 | Kernel | GCC   | GLIBC | ICC  | PGI  | XLC | CLANG |
| ------------ | ------ | ----- | ----- | ---- | ---- | --- | ----- |
| CentOS 7.x   | 3.10   | 4.8.5 | 2.17  | 17.0 | 17.x | NO  | 4.0.0 |

```bash
# kernel
$ uname -r
3.10.0-514.26.2.el7.x86_64

# 安装 gcc
$ yum install -y gcc-4.8.5*

# 安装 glibc
$ yum install -y glibc-2.17*
```

### 安装准备（CentOS 7.3）

* 验证是否有支持 CUDA 的 GPU

```bash
$ lspci | grep -i nvidia
02:00.0 3D controller: NVIDIA Corporation Device 1c07 (rev a1)
03:00.0 3D controller: NVIDIA Corporation Device 1c07 (rev a1)
04:00.0 3D controller: NVIDIA Corporation Device 1c07 (rev a1)
05:00.0 3D controller: NVIDIA Corporation Device 1c07 (rev a1)
81:00.0 3D controller: NVIDIA Corporation Device 1c07 (rev a1)
82:00.0 3D controller: NVIDIA Corporation Device 1c07 (rev a1)
```

如果来自英伟达的显卡可以从 https://developer.nvidia.com/cuda-gpus 中查询到，则该 GPU 是支持 CUDA 的。
如果没有任何输出结果，可以执行 `update-pciids` 命令来更新 PCI 硬件数据库，然后在执行上面的 `lspci` 命令。

* 验证 Linux 版本

```bash
$ uname -m && cat /etc/redhat-release
x86_64
CentOS Linux release 7.3.1611 (Core)
```

* 验证 GCC 是否安装

```bash
$ gcc --version

# 安装
$ yum install -y gcc-4.8.5*
```

* 验证系统是否安装有正确版本的 kernel-headers 和 开发包

CUDA 驱动要求安装与 kernel 相同版本的 kernel-headers 和开发包，如果没有提前安装，rpm 和 deb 会尝试安装最新版本的软件包，因此可能导致软件包的版本与内核版本不一致等问题。

```bash
# 检查内核版本
$ uname -r
3.10.0-514.26.2.el7.x86_64

# 安装与 kernel 相同版本的 kernel-headers 和开发包
$ yum install kernel-devel-$(uname -r) kernel-headers-$(uname -r)

# 如果没有相同的版本，可以从这里下载：http://vault.centos.org/7.3.1611/updates/x86_64/Packages/，如果依然没有只能升级内核
# 如果要安装的 kernel-{headers,devel} 已经安装了较新的版本，必须先移除 yum remove
$ yum install kernel-headers-3.10.0-514.26.2.el7.x86_64.rpm
$ yum install kernel-devel-3.10.0-514.26.2.el7.x86_64.rpm

# 检查软件版本
$ yum list --showduplicates {kernel-devel,kernel-headers}

# 检查软件版本
$  rpm -qa | grep kernel
kernel-devel-3.10.0-514.26.2.el7.x86_64
kernel-3.10.0-514.26.2.el7.x86_64
kernel-tools-libs-3.10.0-514.26.2.el7.x86_64
kernel-tools-3.10.0-514.26.2.el7.x86_64
kernel-3.10.0-514.el7.x86_64
kernel-headers-3.10.0-514.26.2.el7.x86_64
```

* 选择 CUDA 的安装方式

  * 包管理器（rpm 或 deb）：推荐
  * 二进制包（runfile 软件包）

* 下载 NVIDIA CUDA 工具包

下载地址：http://developer.nvidia.com/cuda-downloads
md5 checksum 校验地址：http://developer.nvidia.com/cuda-downloads/checksums ，或者：https://developer.download.nvidia.com/compute/cuda/9.1/Prod/docs/sidebar/md5sum.txt

## 安装

### 安装依赖

NVIDIA 驱动程序依赖于一些外部软件包，因此需要先安装一个第三方软件仓库：

```bash
$ yum install -y epel-release
```

### 安装 CUDA 驱动

* 方式一：runfile 安装

```bash
# 下载 runfile 文件，然后安装
$ md5sum cuda_9.1.85_387.26_linux.run
$ sh cuda_9.1.85_387.26_linux.run
```

* 方式二：rpm 本地安装（推荐）

```bash
# 先下载 cuda rpm 包，然后手动安装
$ md5sum cuda-repo-rhel7-9-1-local-9.1.85-1.x86_64.rpm
$ rpm -i cuda-repo-rhel7-9-1-local-9.1.85-1.x86_64.rpm
$ yum install -y cuda-9.1.85-1
```

* 方式三：rpm 远程网络安装（容易中断）

```bash
$ wget http://developer.download.nvidia.com/compute/cuda/repos/rhel7/x86_64/cuda-repo-rhel7-9.1.85-1.x86_64.rpm
$ rpm -i cuda-repo-rhel7-9.1.85-1.x86_64.rpm

# 查询可用版本
$ yum list cuda --showduplicates

# 安装指定版本
$ yum install -y cuda-9.1.85-1
```

添加 libcuda.so 软连接：

```bash
$ ls -l /usr/lib64/libcuda.so

# 如果上面的命令没有结果
$ ln -s /usr/lib64/nvidia/libcuda.so /usr/lib64/libcuda.so
```

其他：

```bash
# NVIDIA driver 包含多个 kernel 模块
$ lsmod | grep nvidia
nvidia_uvm            684012  4
nvidia_drm             48820  0
nvidia_modeset        900659  1 nvidia_drm
nvidia              13920952  2333 nvidia_modeset,nvidia_uvm

# 如果 nvidia_uvm 模块没有被加载，应该使用如下命令
$ nvidia-modprobe -u -c=0

# 提供了用户级动态链接库，是应用程序能与 kernel 模块和 GPU 设备通信
$ ldconfig -p | grep -E 'nvidia|cuda'
```

### 添加可执行路径

```bash
$ vi /etc/profile
export PATH=$PATH:/usr/local/cuda/bin

# 立即生效
$ source /etc/profile

$ nvcc --version
nvcc: NVIDIA (R) Cuda compiler driver
Copyright (c) 2005-2017 NVIDIA Corporation
Built on Fri_Nov__3_21:07:56_CDT_2017
Cuda compilation tools, release 9.1, V9.1.85

$ nvidia-smi
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 387.26                 Driver Version: 387.26                    |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  P106-100            Off  | 00000000:02:00.0 Off |                  N/A |
| 38%   23C    P8     4W / 120W |   5777MiB /  6075MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
|   1  P106-100            Off  | 00000000:03:00.0 Off |                  N/A |
| 38%   21C    P8     4W / 120W |   5777MiB /  6075MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
|   2  P106-100            Off  | 00000000:04:00.0 Off |                  N/A |
| 38%   22C    P8     4W / 120W |   5777MiB /  6075MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
|   3  P106-100            Off  | 00000000:05:00.0 Off |                  N/A |
| 38%   23C    P8     4W / 120W |   5777MiB /  6075MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
|   4  P106-100            Off  | 00000000:81:00.0 Off |                  N/A |
| 38%   22C    P8     4W / 120W |   5777MiB /  6075MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
|   5  P106-100            Off  | 00000000:82:00.0 Off |                  N/A |
| 38%   21C    P8     4W / 120W |   5777MiB /  6075MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+

+-----------------------------------------------------------------------------+
| Processes:                                                       GPU Memory |
|  GPU       PID   Type   Process name                             Usage      |
|=============================================================================|
|    0     21084      C   /usr/bin/python                             5759MiB |
|    1     21084      C   /usr/bin/python                             5759MiB |
|    2     21084      C   /usr/bin/python                             5759MiB |
|    3     21084      C   /usr/bin/python                             5759MiB |
|    4     21084      C   /usr/bin/python                             5759MiB |
|    5     21084      C   /usr/bin/python                             5759MiB |
+-----------------------------------------------------------------------------+
```

相关说明：

* Temp：温度；

### Tensorflow 测试 CUDA

* 安装 nvidia-docker（1.0）

```bash
# 安装
$ wget https://github.com/NVIDIA/nvidia-docker/releases/download/v1.0.1/nvidia-docker-1.0.1-1.x86_64.rpm
$ rpm -ivh nvidia-docker-1.0.1-1.x86_64.rpm

# 运行
$ systemctl start nvidia-docker

# 检查日志
$ journalctl -f -u nvidia-docker

# 命令
$ nvidia-docker -h
```

* 使用 tensorflow 来测试

如果可以正常导入 tensorflow 包即认为 nvidia-docker 已经可以正常工作了。

```bash
# tensorflow 基础镜像安装了 cuda 和 cudnn
$ nvidia-docker run -it --rm -p 8888:8888 tensorflow/tensorflow:latest-gpu python
> import tensorflow as tf
> sess = tf.Session()
Creating TensorFlow device (/device:GPU:0) -> (device: 0, name: P106-100, pci bus id: 0000:03:00.0, compute capability: 6.1)
Creating TensorFlow device (/device:GPU:1) -> (device: 1, name: P106-100, pci bus id: 0000:04:00.0, compute capability: 6.1)
Creating TensorFlow device (/device:GPU:2) -> (device: 2, name: P106-100, pci bus id: 0000:05:00.0, compute capability: 6.1)
Creating TensorFlow device (/device:GPU:3) -> (device: 3, name: P106-100, pci bus id: 0000:06:00.0, compute capability: 6.1)
Creating TensorFlow device (/device:GPU:4) -> (device: 4, name: P106-100, pci bus id: 0000:07:00.0, compute capability: 6.1)
Creating TensorFlow device (/device:GPU:5) -> (device: 5, name: P106-100, pci bus id: 0000:0b:00.0, compute capability: 6.1)
Creating TensorFlow device (/device:GPU:6) -> (device: 6, name: P106-100, pci bus id: 0000:0c:00.0, compute capability: 6.1)
Creating TensorFlow device (/device:GPU:7) -> (device: 7, name: P106-100, pci bus id: 0000:0d:00.0, compute capability: 6.1)
Creating TensorFlow device (/device:GPU:8) -> (device: 8, name: P106-100, pci bus id: 0000:0e:00.0, compute capability: 6.1)
```

### 安装 nvidia-docker

```bash
$ wget -P /tmp https://github.com/NVIDIA/nvidia-docker/releases/download/v1.0.1/nvidia-docker-1.0.1-1.x86_64.rpm
sudo rpm -i /tmp/nvidia-docker*.rpm && rm /tmp/nvidia-docker*.rpm
sudo systemctl start nvidia-docker
```

### 处理冲突

安装 CUDA 之前需要先卸载可能冲突的软件包，除了已安装软件包可能冲突，多个软件仓库可以同样可能导致安装过程包冲突。

## 问题小结

* 安装 cuda 过程中遇到如下问题

```plain
Error: nvidia-x11-drv-340xx conflicts with 1:xorg-x11-drv-nvidia-387.26-1.el7.x86_64
 You could try using --skip-broken to work around the problem
 You could try running: rpm -Va --nofiles --nodigest
```

解决办法：是因为我添加了 elrepo 软件仓库导致了包冲突，需要移除该软件仓库：

```bash
$ rpm -qf /etc/yum.repos.d/elrepo.repo
$ yum remove elrepo-release
```

## 相关命令

```bash
# 查询 Nvidia driver 的版本
$ modinfo -F version nvidia

# nvidia 设备
$ lspci | grep -i nvidia
```

## 参考

* [NVIDIA CUDA Installation Guide for Linux](http://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html)
* [NVIDIA CUDA INSTALLATION GUIDE FOR
LINUX(pdf)](https://developer.download.nvidia.com/compute/cuda/9.1/Prod/docs/sidebar/CUDA_Installation_Guide_Linux.pdf)

》 https://developer.nvidia.com/cuda-toolkit-archive