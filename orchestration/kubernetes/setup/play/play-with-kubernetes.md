# Play with Kubernetes

[Play with Kubernetes](http://play-with-k8s.com/)提供了一个免费的Kubernets体验环境，直接访问[http://play-with-k8s.com](http://play-with-k8s.com/)就可以使用kubeadm来创建Kubernetes集群。注意，每个创建的集群最长可以使用4小时。

Play with Kubernetes有个非常方便的功能：自动在页面上显示所有NodePort类型服务的端口，点解该端口即可访问对应的服务。

详细使用方法可以参考[Play-With-Kubernetes](https://kubernetes.feisky.xyz/appendix/play-with-k8s.html)。

```bash
$ # node1: 初始化一个 master
$ kubeadm init --apiserver-advertise-address $(hostname -i)

$ # node2: 加入一个 node
$ kubeadm join --token 09ed46.29e7cede69d551e7 10.0.3.3:6443

$ # 创建集群网络
$ kubectl apply -n kube-system -f \
    "https://cloud.weave.works/k8s/net?k8s-version=$(kubectl version | base64 | tr -d '\n')"

 $ # 创建 kubernetes dashboard
 $ curl -L -s https://git.io/kube-dashboard  | sed 's/targetPort: 9090/targetPort: 9090\n  type: LoadBalancer/' | kubectl apply -f -
```
