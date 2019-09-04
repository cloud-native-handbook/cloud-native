# Nvidia docker

注意事项：

* 使用 nvidia docker plugin 之前需要先在宿主机上安装 CUDA 驱动，另外容器中也需要安装 CUDA，[看图](https://github.com/NVIDIA/nvidia-docker)。
* 如果是在 CentOS 系统中使用 docker 容器运行时，nvidia-docker2 不支持 Docker 公司官方提供的 `docker-engine` 安装包，可以使用 RedHat 公司提供的 `docker` 安装包（1.12.6 | 1.13.1）；或者升级到 docker-ce 稳定版（17.03.2 | 17.06.2 | 17.09.0 | 17.09.1 | 17.12.0）；
* 如果使用的 nvidia-docker 1.0，kubenetes 只能通过挂载 cuda driver 目录的方式申请 GPU 资源，因此宿主机需要安装 CUDA 驱动并且运行 nvidia-docker 服务来创建 nvidia-driver volume；如果使用的是 nvidia-docker2，既可以使用挂载 cuda driver 的方式（`alpha.kubernetes.io/nvidia-gpu`），也可以使用 nvidia device plugin 的方式（`nvidia.com/gpu`）。

## 安装 1.0

```bash
# 安装
$ ops/nvidia/install-nvidia-docker-1.0.sh

# 需要运行服务并检查日志
$ systemctl restart nvidia-docker
$ journalctl -e -u nvidia-docker

# 运行测试用例
$ nvidia-docker run --rm nvidia/cuda:9.0-devel nvidia-smi
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 387.26                 Driver Version: 387.26                    |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  P106-100            On   | 00000000:02:00.0 Off |                  N/A |
| 38%   28C    P8     7W / 120W |     10MiB /  6075MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
|   1  P106-100            On   | 00000000:03:00.0 Off |                  N/A |
| 38%   25C    P8     8W / 120W |     10MiB /  6075MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
```

相关说明：

* `nvidia-docker-plugin` 是一个后端守护进程，用于发现宿主机的驱动文件和 GPU 设备，并响应来自 nvidia-docker 的请求；
* `nvidia-docker` 是一个客户端进程，通过访问 `nvidia-docker-plugin` API （默认 localhost:3476）获取驱动文件（nvidia-driver volume）和 GPU 设备等信息，当使用 nvidia-docker 命令运行 cuda 容器时，会将其作为 docker run / docker create 的命令行参数，因此才可以在 cuda 容器中运行 nvidia-smi 等命令（实际路径： /var/lib/nvidia-docker/volumes/nvidia_driver/<version>/bin），并且获取相应的 GPU 设备资源；

## 安装 2.0

### 安装要求

kernel version > 3.10
Docker version > 1.12
Nvidia driver ~= 361.93
NVIDIA GPU with Architecture > Fermi (2.1)

* Nvidia 驱动必须安装；
* 支持的 Docker 版本主要是：
    1. RedHat 公司提供的 `docker` 安装包：1.12.6，1.13.1；
    2. Docker 公司提供的 `docker-engine` 安装包：1.12.6，1.13.1 （CentOS 不支持）；
    3. docker-ce 稳定版：17.03.2, 17.06.2, 17.09.0, 17.09.1, 17.12.0；

### 卸载 1.0

如果已经安装了 nvidia-docker 1.0 需要先卸载。

```bash
# 移除所有用 nvidia-docker 1.0 启动的容器
$ docker volume ls -q -f driver=nvidia-docker | xargs -r -I{} -n1 docker ps -q -a -f volume={} | xargs -r docker rm -f

# 卸载
$ yum remove -y nvidia-docker
```

### 安装 2.0

```bash
$ curl -s -L https://nvidia.github.io/nvidia-docker/centos7/x86_64/nvidia-docker.repo | \
    sudo tee /etc/yum.repos.d/nvidia-docker.repo

# 查看有哪些相应的版本
$ yum list nvidia-docker2 --showduplicates
$ yum list nvidia-container-runtime --showduplicates

# 根据宿主机 docker 的版本安装相应的版本
$ yum install -y nvidia-docker2-2.0.2-1.docker17.06.2.ce
$ yum install -y nvidia-container-runtime-1.1.1-1.docker17.06.2

# 重新加载 docker daemon 配置
$ pkill -SIGHUP dockerd

# 测试用例
$ docker run --runtime=nvidia --rm nvidia/cuda:9.0-devel nvidia-smi
```

## nvidia-docker 是如何运作的

注意：`1.0` 和 `2.0` 的运作方式是不同的。如果使用 `1.0` 需要启动 `nvidia-docker-plugin`。

### 1.0

```bash
# 启动 nvidia-docker-plugin，这将提供一个 REST API（localhost:3476），并创建一个 sock/volume 目录：/var/lib/nvidia-docker
$ systemctl start nvidia-docker

# 启动服务后默认不会自动创建 nvidia-driver volume，可以手动创建；或者使用 nvidia-docker 命令任意启动一个 cuda 容器，这会自动创建
$ docker volume create --driver=nvidia-docker --name=nvidia_driver_$(modinfo -F version nvidia)
$ docker volume ls
nvidia-docker  nvidia_driver_387.26

# 获取所有 GPU（输出结果将作为 docker run / docker create 参数）
$ curl -s http://localhost:3476/v1.0/docker/cli?vol=nvidia_driver
--volume-driver=nvidia-docker \
--volume=nvidia_driver_387.26:/usr/local/nvidia:ro \
--device=/dev/nvidiactl \
--device=/dev/nvidia-uvm \
--device=/dev/nvidia-uvm-tools \
--device=/dev/nvidia0 \
--device=/dev/nvidia1 \
--device=/dev/nvidia2 \
[...]

# 获取第 0,2 块 GPU （同上，设备索引是有优先级的，[0,2] 不同于 [2,0]）
$ curl -s http://localhost:3476/v1.0/docker/cli?dev=0+2\&vol=nvidia_driver
--volume-driver=nvidia-docker \
--volume=nvidia_driver_387.26:/usr/local/nvidia:ro \
--device=/dev/nvidiactl \
--device=/dev/nvidia-uvm \
--device=/dev/nvidia-uvm-tools \
--device=/dev/nvidia0 \
--device=/dev/nvidia2

# 申请所有 GPU（两个命令等价，但方式二不能检查镜像是否与安装的驱动兼容）
$ nvidia-docker run --rm nvidia/cuda:9.0-devel nvidia-smi
$ docker run --rm `curl -s http://localhost:3476/v1.0/docker/cli?vol=nvidia_driver` nvidia/cuda:9.0-devel nvidia-smi

# 申请第 2,0 块 GPU（同上，NV_GPU 可以是 GPU 设备的索引，也可以是设备 UUID）
$ NV_GPU='2,0' nvidia-docker run --rm nvidia/cuda:9.0-devel nvidia-smi
$ docker run --rm `curl -s http://localhost:3476/v1.0/docker/cli?dev=2+0\&vol=nvidia_driver` nvidia/cuda:9.0-devel nvidia-smi
```

### 2.0

nvidia-docker2 没有后端守护进程，不需要创建 nvidia-docker volume，但是多了一个 `nvidia-docker-container`。nvidia-docker2 会注册新的（额外的）容器运行时到 Docker Daemon（路径：`/etc/docker/daemon.json`，如果原来已经存在会被覆盖）。当需要使用 GPU 资源时，通过 `docker run` 的 `--runtime=nvidia` 参数选择所需的容器运行时。

```bash
$ cat /etc/docker/daemon.json
{

}

# 等同于（'nvidia' 可以自命名）
$ dockerd --add-runtime=nvidia=/usr/bin/nvidia-container-runtime ...
```

为了向后兼容，nvidia-docker2 也提供了一个 `/usr/bin/nvidia-docker` 容器运行时，用法与 1.0 相同；它将自动注入 `--runtime=nvidia` 参数并将 `NV_GPU` 转换成 `NVIDIA_VISIBLE_DEVICES`。

```bash
# 通过 nvidia runtime 申请所有 GPU 资源（方式二对非 CUDA 镜像也能开启 GPU 支持）
$ docker run --runtime=nvidia --rm nvidia/cuda:9.0-devel nvidia-smi
$ docker run --runtime=nvidia --rm -e NVIDIA_VISIBLE_DEVICES=all nvidia/cuda:9.0-devel nvidia-smi

# 限制 GPU
$ docker run --runtime=nvidia --rm -e NVIDIA_VISIBLE_DEVICES=0,2 nvidia/cuda:9.0-devel nvidia-smi
$ docker run --runtime=nvidia --rm -e NVIDIA_VISIBLE_DEVICES=none nvidia/cuda:9.0-devel nvidia-smi

# 修改默认运行时（docker 默认运行时为 runc），这样不用每次为 docker run 添加 --runtime=nvidia
$ dockerd --default-runtime=nvidia ...
$ docker info | grep -i runtime
```

### k8s 中的不同点

* 使用方式不同：
  * 1.0: `nvidia-docker/nvidia-docker-plugin` + k8s 挂载 nvidia driver 及动态链接库；
  * 2.0: `nvidid-docker2/nvidia-container-runtime`（--default-runtime） + `nvidia device plugin`；
* GPU 资源名不同：
  * 1.0: `alpha.kubernetes.io/nvidia-docker`；
  * 2.0: `nvidia.com/gpu`；
* 默认申请到的 GPU 资源数量不同：
  * 1.0: 不设置则不申请；
  * 2.0: 不设置则申请宿主机的所有剩余资源

## 参考

* [nvidia docker plugin](https://github.com/NVIDIA/nvidia-docker/wiki/nvidia-docker-plugin)
* [nvidia docker plugin Internals](https://github.com/NVIDIA/nvidia-docker/wiki/Internals)