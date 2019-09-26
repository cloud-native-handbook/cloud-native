# kubectl 的安装与配置

## 配置

kubectl 要访问 Kubernetes 集群，需要一个 _kubeconfig_ 文件，该配置文件位于 `~/.kube/config`（部署 Minikube 集群时会自动创建）。

```sh
# 验证 kubectl 是否配置正确
$ kubectl cluster-info
Kubernetes master is running at https://127.0.0.1:34901
KubeDNS is running at https://127.0.0.1:34901/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

## shell 自动完成

kubectl 为 Bash 和 Zsh 提供了自动完成支持。

### Bash on Linux

```bash
# 自动完成脚本依赖于 bash-completion
$ sudo apt-get install bash-completion
$ sudo yum install bash-completion
```

```bash
$ echo 'source <(kubectl completion bash)' >> ~/.bashrc
```

```bash
$ kubectl completion bash | sudo tee /etc/bash_completion.d/kubectl
```

```bash
# 按 Tab 验证
$ kubectl get
```

### Bash on macOS

```bash
# 验证 bash-completion v2 是否已经安装
$ type _init_completion

$ brew install bash-completion@2
```

```sh
$ export BASH_COMPLETION_COMPAT_DIR="/usr/local/etc/bash_completion.d"
[[ -r "/usr/local/etc/profile.d/bash_completion.sh" ]] && . "/usr/local/etc/profile.d/bash_completion.sh"
```

```sh
$ echo 'source <(kubectl completion bash)' >>~/.bashrc

$ kubectl completion bash >/usr/local/etc/bash_completion.d/kubectl
```

### Zsh

```zsh
$ vi ~/.zshrc
source <(kubectl completion zsh)
```
