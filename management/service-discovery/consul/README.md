# Consul

## 术语

* Agent

Agent 是一个守护进程
运行在Consul集群的每个成员上
有Client 和 Server 两种模式
所有Agent都可以被调用DNS或者HTTP API,并负责检查和维护同步

* Client

Client 将所有RPC请求转发至Server
Client 是相对无状态的
Client 唯一做的就是参与LAN Gossip Pool
Client 只消耗少量的资源和少量的网络带宽

* Server

参与 Raft quorum(一致性判断)
响应RPC查询请求
维护集群的状态
转发查询到Leader 或 远程数据中心

* Datacenter

顾名思义其为数据中心, 如何定义数据中心呢? 需要以下三点

私有的
低延迟
高带宽
故: 可以简单的理解为同属一个内网环境, 如北京机房和香港机房就不一定满足以上三个条件

## 入门

```bash
$ consul agent -dev -dns-port=53

$ curl http://127.0.0.1:8500/v1/catalog/service/consul

$ curl -X PUT -d '
{
  "Datacenter": "dc1",
  "Node": "harbor",
  "Address": "172.254.157.244",
  "Service": {
    "Service": "harbor",
    "tags": ["v1.2.0"],
    "Port": 80
  }
}' http://127.0.0.1:8500/v1/catalog/register

$ curl http://127.0.0.1:8500/v1/catalog/nodes
$ curl http://127.0.0.1:8500/v1/catalog/services

$ curl http://127.0.0.1:8500/v1/catalog/service/harbor
$ curl http://127.0.0.1:8500/v1/catalog/node/harbor

# A 记录解析
$ dig @127.0.0.1 -p 53 harbor.service.consul -t ANY

# SRV 记录解析
$ dig @127.0.0.1 -p 53 harbor.service.consul -t SRV

# TXT 记录解析
$ dig @127.0.0.1 -p 53 harbor.node.consul -t TXT
```

$ consul agent -dev -node-meta "baz:bang" -node-meta 'blurb' -node foo
$ dig @localhost -p 8600 foo.node.consul. any

```bash
# acme-v01.api.letsencrypt.org
$ ./certbot --manual --preferred-challenges dns certonly
> harbor.node.services

$ consul agent -dev -dns-port=53 -node-meta='rfc1035-:8A1wwM73c5qOoT4zbRk78fLMULw1NyLxLFO1fMG53g0' -node=_acme-challenge.harbor -domain=services

curl -X PUT -d '
{
  "Datacenter": "dc1",
  "Node": "harbor",
  "Address": "172.254.157.244",
  "Service": {
    "Service": "harbor",
    "tags": ["v1.2.0"],
    "Port": 80
  }
}' http://127.0.0.1:8500/v1/catalog/register


$ dig @127.0.0.1 -p 53 _acme-challenge.harbor.node.services any
$ curl http://127.0.0.1:8500/v1/catalog/nodes
```

https://www.consul.io/downloads.html

https://releases.hashicorp.com/consul/1.0.3/consul_1.0.3_linux_amd64.zip?_ga=2.220261848.1969143888.1516866082-1564161039.1514272265

{
  "datacenter": "dc_yu",
  "data_dir": "./consul-data",
  "ui_dir": "./consului",
  "log_level": "TRACE",
  "server": true,
  "bootstrap": true,
  "node_name":"server_1",
  "bind_addr":"127.0.0.1"
}

{
   "services": [{
   "id":"registry",
   "name":"registry",
   "tags":["registry"],
   "address": "192.168.10.50",
   "port": 5000,
   "checks": [
     {
       "http": "http://192.168.10.50:8000/v2/_catalog",
       "interval": "10s"
    }
   ]
 }]
}

consul agent -config-file config.json -ui
consul agent -dev

consul members

curl 192.168.10.50:8500/v1/catalog/nodes

dig @127.0.0.1 -p 8600 Yin.node.consul

https://www.consul.io/docs/agent/dns.html

https://www.consul.io/docs/guides/forwarding.html

## 参考

* https://www.jianshu.com/p/28c6bd590ca0

https://kevinguo.me/2017/09/01/docker-consul-consul-template-registrator-nginx/

* [Consul + fabio 实现自动服务发现、负载均衡](http://dockone.io/article/1567)
