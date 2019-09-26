# 容器运行时

* CRI（Container Runtime Interface）
* OCI

## 定义

## CNCF 生态

<style type="text/css">
    .wrapper {
        width: 576px;
    }

    .link {
        display: inline-block
    }

    .noncncf, .graduated, .incubating {
        cursor: pointer;
        position: relative;
        float: left;
        width: 178px;
        height: 146px;
        margin-right: 10px;
        margin-bottom: 10px
    }

    .graduated {
        border: 2px solid rgb(24, 54, 114)
    }

    .incubating {
        border: 2px solid rgb(83, 113, 189);
    }

    .noncncf {
        border: 2px solid rgb(118, 181, 237);
    }

    .graduated-img, .incubating-img, .noncncf-img {
        width: 170px;
        height: 114px;
        margin: 2px;
        padding: 2px
    }

    .graduated-tips, .incubating-tips, .noncncf-tips {
        position: absolute;
        left: 0px;
        right: 0px;
        bottom: 0px;
        height: 24px;
        text-align: center;
        color: white;
        font-size: 14px;
        line-height: 28px
    }

    .graduated-tips {
        background: rgb(24, 54, 114);
    }

    .incubating-tips {
        background: rgb(83, 113, 189);
    }

    .noncncf-tips {
        background: rgb(118, 181, 237);
    }

    .sandbox {
        cursor: pointer;
        position: relative;
        float: left;
        width: 86px;
        height: 70px;
        margin-right: 10px;
        margin-bottom: 10px;
    }

    .sandbox-img {
        width: 80px;
        height: 64px;
        padding: 2px;
        border: 1px solid grey;
        border-radius: 3px;
    }

    .sandbox-img-none {
        background: rgb(238, 238, 238);
        cursor: default
    }
</style>

<div class="wrapper">
    <div class="graduated">
        <a href="containerd/README.md" class="link">
            <img src=".images/logos/containerd.svg" class="graduated-img">
            <div class="graduated-tips">CNCF Graduated</div>
        </a>
    </div>
    <div class="incubating">
        <a href="cri-o/README.md" class="link">
            <img src=".images/logos/cri-o.svg" class="incubating-img">
            <div class="incubating-tips">CNCF Incubating</div>
        </a>
    </div>
    <div class="incubating">
        <a href="rkt/README.md" class="link">
            <img src=".images/logos/rkt.svg" class="incubating-img">
            <div class="incubating-tips">CNCF Incubating</div>
        </a>
    </div>
    <div class="sandbox">
        <a href="firecracker/README.md" class="link">
            <img src=".images/logos/firecracker.svg" class="sandbox-img">
        </a>
    </div>
    <div class="sandbox">
        <a href="g-visor/README.md" class="link">
            <img src=".images/logos/g-visor.svg" class="sandbox-img">
        </a>
    </div>
    <div class="sandbox">
        <a href="kata-containers/README.md" class="link">
            <img src=".images/logos/kata-containers.svg" class="sandbox-img">
        </a>
    </div>
    <div class="sandbox">
        <a href="lxd/README.md" class="link">
            <img src=".images/logos/lxd.svg" class="sandbox-img">
        </a>
    </div>
    <div class="sandbox">
        <a href="nabla-containers/README.md" class="link">
            <img src=".images/logos/nabla-containers.svg" class="sandbox-img">
        </a>
    </div>
    <div class="sandbox">
        <a href="pouch/README.md" class="link">
            <img src=".images/logos/pouch.svg" class="sandbox-img">
        </a>
    </div>
    <div class="sandbox">
        <a href="runc/README.md" class="link">
            <img src=".images/logos/runc.svg" class="sandbox-img">
        </a>
    </div>
    <div class="sandbox">
        <a href="singularity/README.md" class="link">
            <img src=".images/logos/singularity.svg" class="sandbox-img">
        </a>
    </div>
    <div class="sandbox">
        <a href="smart-os/README.md" class="link">
            <img src=".images/logos/smart-os.svg" class="sandbox-img">
        </a>
    </div>
    <div class="sandbox">
        <a href="unik/README.md" class="link">
            <img src=".images/logos/unik.svg" class="sandbox-img">
        </a>
    </div>
    <div style="clear:both"></div>
</div>

## Non-CNCF 生态

<div class="wrapper">
    <div class="noncncf">
        <a href="~docker/README.md" class="link">
            <img src=".images/logos/docker.svg" class="noncncf-img">
            <div class="noncncf-tips">Non CNCF</div>
        </a>
    </div>
    <div style="clear:both"></div>
</div>

## 历史

Imctfy > libcontainer > RunC

## 容器 vs 虚拟机

* 容器比虚拟机更加透明，这有利于监控和管理

## Cgroup Drivers

<!--
When systemd is chosen as the init system for a Linux distribution, the init process generates and consumes a root control group (cgroup) and acts as a cgroup manager. Systemd has a tight integration with cgroups and will allocate cgroups per process. It’s possible to configure your container runtime and the kubelet to use cgroupfs. Using cgroupfs alongside systemd means that there will then be two different cgroup managers.

Control groups are used to constrain resources that are allocated to processes. A single cgroup manager will simplify the view of what resources are being allocated and will by default have a more consistent view of the available and in-use resources. When we have two managers we end up with two views of those resources. We have seen cases in the field where nodes that are configured to use cgroupfs for the kubelet and Docker, and systemd for the rest of the processes running on the node becomes unstable under resource pressure.

Changing the settings such that your container runtime and kubelet use systemd as the cgroup driver stabilized the system. Please note the native.cgroupdriver=systemd option in the Docker setup below.
-->

> Caution: Changing the cgroup driver of a Node that has joined a cluster is highly unrecommended. If the kubelet has created Pods using the semantics of one cgroup driver, changing the container runtime to another cgroup driver can cause errors when trying to re-create the PodSandbox for such existing Pods. Restarting the kubelet may not solve such errors. The recommendation is to drain the Node from its workloads, remove it from the cluster and re-join it.


## 参考

* [Container runtimes](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)
