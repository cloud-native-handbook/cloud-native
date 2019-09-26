# Katacode

## Kubernetes Playground

[Katacoda playground](https://www.katacoda.com/courses/kubernetes/playground)也提供了一个免费的2节点Kuberentes体验环境，网络基于WeaveNet，并且会自动部署整个集群。但要注意，刚打开[Katacoda playground](https://www.katacoda.com/courses/kubernetes/playground)页面时集群有可能还没初始化完成，可以在master节点上运行`launch.sh`等待集群初始化完成。

部署并访问kubernetes dashboard的方法：

```bash
# 在master node上面运行
$ kubectl create -f https://git.io/kube-dashboard
kubectl proxy --address='0.0.0.0' --port=8080 --accept-hosts='^*$'&
```

然后点击Terminal Host 1右边的➕，从弹出的菜单里选择View HTTP port 8080 on Host 1，即可打开Kubernetes的API页面。在该网址后面增加`/ui`即可访问dashboard。

## Getting Started With Kubeadm

<https://www.katacoda.com/courses/kubernetes/getting-started-with-kubeadm>
