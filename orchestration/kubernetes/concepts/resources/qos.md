# 服务质量（QoS）

从容器的角度出发，为了限制容器使用的CPU和内存，是通过cgroup来实现的，目前kubernetes的QoS只能管理CPU和内存，所以kubernetes现在也是通过对cgroup的配置来实现QoS管理的。


## 参考

* [Kubernetes Resource QoS 机制解读](http://blog.csdn.net/waltonwang/article/details/55005453)
* [Kuberntes 服务质量保证（QoS）](https://www.kubernetes.org.cn/2545.html)
* [Configure Quality of Service for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/quality-service-pod/)
