用户请求表：935256

| username | GPUs | CPUs | Mem  | Storage |
| yin      | 15   | 5    | 15Gi | 50Gi    |

管理员操作流程：

1. 创建 yin 用户（一个用户对于一个命名空间）；
2. LimitRange 和 ResourceQuot 限制 yin 用户使用的 cpu、memory、storage；
3. 从 `主机信息表` 中人工计算出分配的 GPU 节点；
4. 将 token（taint） 告诉 yin 用户；
5. yin 用户使用 token（toleration）部署 Pod。

主机信息表：

| hostname     | ip            | GPUs | GPU type | token(taint)         | user |
| kube-node-50 | 192.168.10.50 | 6    | P106-100 | sdfjhke6sdf4s52df4sd | yin  |
| kube-node-51 | 192.168.10.51 | 9    | P106-100 | sdfjhke9df4s52df4sd  | yin  |
| kube-node-52 | 192.168.10.52 | 4    | P106-100 | sdfjhke4sdf4s52df4sd | null |
| kube-node-53 | 192.168.10.53 | 8    | P106-100 | sdfjhke8sdf4s52df4sd | null |