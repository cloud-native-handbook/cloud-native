# GPU

## 准备工作

为了能让 Kubernetes 调度 GPU 资源，需要做如下准备工作：

* Node 节点必须预装 Nvidia 驱动，否则 kubelet 将无法检测到 Nvidia GPU；安装好驱动后，运行 [nvidia-docker-plugin](https://github.com/NVIDIA/nvidia-docker) 确保所有驱动已经加载；
* 所有组件必须设置 `--feature-gates="Accelerators=true"`，包括 kube-apiserver、kube-controller-manager、kube-scheduler、kubelet、kube-proxy；
* Node 节点必须使用 `docker engine` 作为容器运行时。

做好以上准备工作后，Node 节点将自动发现并公开所有 Nvidia GPU 作为可调度资源。

## Kubernetes 调度 GPU

创建 GPU 容器时，`resources`.`limists`.`alpha.kubernetes.io/nvidia-gpu` 申请的 GPU 数量不能超过 GPU 的总数。

为了让 GPU 容器调度到 GPU 节点上，可以使用 `nodeSelector` 或 `Node Affinity`；如果两者都没指定，Kubernetes 会自动将 容器调度到 Node 标签带有 `alpha.kubernetes.io/nvidia-gpu-name` 的节点上。

```bash
# kubectl 查看节点的 gpu 个数
$ kubectl get node kube-node-1 -o yaml | grep alpha.kubernetes.io/nvidia-gpu
alpha.kubernetes.io/nvidia-gpu-name: P106-100
alpha.kubernetes.io/nvidia-gpu: "6"
alpha.kubernetes.io/nvidia-gpu: "6"
```

## 直接申请 GPU 并访问 CUDA 库（1.8 以下）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  containers:
  - name: cuda
    image: nvidia/cuda:9.0-devel
    imagePullPolicy: IfNotPresent
    command: ["sleep", "3600"]
    resources:
      limits:
        alpha.kubernetes.io/nvidia-gpu: 2
    volumeMounts:
    - name: nvidia-driver-387-26
      mountPath: /usr/local/nvidia
      readOnly: true
    - name: libcuda-so
      mountPath: /usr/lib/x86_64-linux-gnu/libcuda.so
    - name: libcuda-so-1
      mountPath: /usr/lib/x86_64-linux-gnu/libcuda.so.1
    - name: libcuda-so-387-26
      mountPath: /usr/lib/x86_64-linux-gnu/libcuda.so.387.26
  volumes:
  - name: nvidia-driver-387-26
    hostPath:
      path: /var/lib/nvidia-docker/volumes/nvidia_driver/387.26
  - name: libcuda-so
    hostPath:
      path: /usr/lib64/nvidia/libcuda.so
  - name: libcuda-so-1
    hostPath:
      path: /usr/lib64/nvidia/libcuda.so.1
  - name: libcuda-so-387-26
    hostPath:
      path: /usr/lib64/nvidia/libcuda.so.387.26
```

相关说明：

* nvidia-driver-387-26：`nvidia-docker-plugin`；
* 如果不指定 `alpha.kubernetes.io/nvidia-gpu` 资源，将不会申请到任何 GPU；

## 通过 NVIDIA 设备插件申请 GPU 并访问 CUDA 库（1.8 及以上）

由于 1.8 和 1.9 版本的 device plugin 不兼容，所以不同版本的集群需要单独部署。

### 准备工作

* 安装 nvidia-docker 2.0，并配置 `--runtime=nvidia` 作为 docker daemon 的默认运行时；
* kubelet 必须指定 `--feature-gates=DevicePlugins=true` 参数。

### 1.8

```bash
$ wget -O nvidia-device-plugin-1.8.yaml https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v1.8/nvidia-device-plugin.yml

# 标记哪些节点有 Nvidia GPU
$ kubectl label node kube-node-1 node-type=NVIDIA

# 增加了 nodeSelector 和 namespace
$ cat <<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin-daemonset
  namespace: kube-system
spec:
  template:
    metadata:
      labels:
        name: nvidia-device-plugin-ds
    spec:
      nodeSelector:
        node-type: gpu
      containers:
      - image: nvidia/k8s-device-plugin:1.8
        name: nvidia-device-plugin-ctr
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
        volumeMounts:
          - name: device-plugin
            mountPath: /var/lib/kubelet/device-plugins
      volumes:
        - name: device-plugin
          hostPath:
            path: /var/lib/kubelet/device-plugins
EOF
```

测试用例：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod-using-device-plugin
  labels:
    app: gpu-pod-using-device-plugin
spec:
  containers:
  - name: cuda
    image: tensorflow/tensorflow:latest-gpu
    imagePullPolicy: IfNotPresent
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 300m
        memory: 512Mi
        nvidia.com/gpu: 2
    ports:
    - name: tf
      containerPort: 8888
    readinessProbe:
      httpGet:
        path: /
        port: 8888
      initialDelaySeconds: 10
      periodSeconds: 5
    livenessProbe:
      httpGet:
        path: /
        port: 8888
      initialDelaySeconds: 10
      periodSeconds: 5
```

> 如果不为 CUDA 容器设置 GPU 限制，则主机上所有的容器都会暴露给容器。

### 1.9

```bash
$ wget -O nvidia-device-plugin-1.9.yaml https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v1.9/nvidia-device-plugin.yml
$ kubectl apply -f nvidia-device-plugin.yaml
```

```yaml
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin-daemonset
  namespace: kube-system
spec:
  template:
    metadata:
      labels:
        name: nvidia-device-plugin-ds
    spec:
      containers:
      - image: nvidia/k8s-device-plugin:1.9
        name: nvidia-device-plugin-ctr
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
        volumeMounts:
          - name: device-plugin
            mountPath: /var/lib/kubelet/device-plugins
      volumes:
        - name: device-plugin
          hostPath:
            path: /var/lib/kubelet/device-plugins
```

## 参考

* [Running TensorFlow (with GPU) on Kubernetes](https://medium.com/jim-fleming/running-tensorflow-on-kubernetes-ca00d0e67539)
* [NVIDIA device plugin for Kubernetes](https://github.com/NVIDIA/k8s-device-plugin)