# Spark Stanadalone Cluster 高可用

## 部署

```bash

```

## 确定 Leader Master

确定谁是 Leader Master，以便访问其 UI。

```bash
masterCounts=`kubectl -n spark-standalone get statefulset/master | awk '{if(NR>1)print $2}'`

for ((i=0; i<$masterCounts; i++)); do
    status=`curl -s "http://master-$i.master-hs.spark-standalone.svc.cluster.local:8080/json/" | jq -r '.status'`
    if [ "$status" == "ALIVE" ]; then
        echo "Spark Master Leader UI is \"master-$i.master-hs.spark-standalone.svc.cluster.local:8080\""
    fi
done
```

最好是自己写个脚本代理到 Leader，并封装成镜像，然后部署到 Kubernetes，参考：

* https://github.com/elsonrodriguez/spark-ui-proxy
* https://github.com/aseigneurin/spark-ui-proxy

```bash
$ python spark-ui-proxy.py h1:8080,h2:8080,h3:8080 8888
```

## 参考

* [Spark - High availability](https://gist.github.com/aseigneurin/3af6b228490a8deab519c6aea2c209bc)