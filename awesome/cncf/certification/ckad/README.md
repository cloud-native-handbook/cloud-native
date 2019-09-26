# CKAD

## 其他人考试记录

> deploy a container on all nodes and do not make changes to existing taints.
> Search for a specific string in the pod logs and write it to a file.
> Debug an issue where worker node is NotReady and make the changes permanent (kubelet was not running,)
> Debug an issue with cluster, login into all the nodes and debug the issue and make changes permanent. (Check that all services on master node and kubelet on worker nodes. kube-scheduler was not running.
> Start a Pod and fail the container until a file is present. Create initContainer to do the task. (Mount the volume in initContainer and create the file under mountPath.)
> List all pvs and sort by the name and write to a file.
> Check which pod is consuming more cpu in a namespace and write the most consuming pod to a file (Hint: use kubectl top pod -n <namespace>).
> Filter the pods by label and print only pod names (Using -l <label> and --jsonpath=‘{{.items[*]}}{“\n”}}{{.metadata.name}}“’)
> Create a pod, service under as static pods, using manifests. (Hint: Update systemd kubelet.service file with pod-manifests-path flag path to manifests folder location.)

## 参考

* [CKAD_beta_exam](https://kubernetes.slack.com/messages/DAP1J9139/convo/DAP1J9139-1526007023.000136/)
* <https://kubernauts.io/en/>
* [My CKA exam “Kubernetes Certified Administrator”](https://medium.com/@walidshaari/kubernetes-certified-administrator-cka-43a25ca4c61c)
