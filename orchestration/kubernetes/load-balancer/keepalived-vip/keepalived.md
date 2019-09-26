# Keepalived

> http://blog.csdn.net/lexang1/article/details/52386909

当一台 LB 节点无法提供服务（keepalived、haproxy 或者主机宕机），另一台 LB 节点自动转换为 `MASTER` 状态并继承 VIP。

1. 如果 Keepalived 的状态由 `BACKEND` 转换为 `MASTER`，则需要发送邮件通知运维人员（keepalived_check.sh）；
2. haproxy 之间的配置需要同步：当一台 HAProxy 的配置发生改变，另一台的配置应该同步，并且 reload（rsync + inotify: nginx_rsync.sh）；
3. 如果 Keepalived 挂掉则检测并重启 Keepalived；如果 HAProxy 挂掉则应该关闭 Keepalived，确保 VIP 可以漂移到 Keepalived BACKUP 节点上（nginx_check.sh）；如果 HAProxy 重启则应该重启 Keepalived（haproxy-check.sh）；

Keepalived 是一个类似于 layer 3, 4 & 5 交换机制的软件，也就是我们平时说的第 3 层、第 4 层和第 5 层交换。


Keepalived 是基于 VRRP 协议实现的，VRRP 全称 Virtual Router Redundancy Protocol，即虚拟路由冗余协议。

虚拟路由冗余协议，可以认为是实现路由器高可用的协议，即将N台提供相同功能的路由器组成一个路由器组，这个组里面有一个master和多个backup，master上面有一个对外提供服务的vip（该路由器所在局域网内其他机器的默认路由为该vip），master会发组播，当backup收不到vrrp包时就认为master宕掉了，这时就需要根据VRRP的优先级来选举一个backup当master。这样的话就可以保证路由器的高可用了。

### 安装

```bash
yum install -y keepalived
yum install -y haproxy
yum install -y ipvsadm
yum install psmisc # killall
```

```bash
yum -y install inotify-tools
```

## Keepalived

* 主（kube-lb-1）

```bash
$ cp /etc/keepalived/{keepalived.conf,keepalived.conf.bak}
$ vi /etc/keepalived/keepalived.conf
global_defs {
  # 出现故障时同时谁
  notification_email {
   root@localhost
  }
  # 发件人
  notification_email_from admin@localhost
  smtp_server 127.0.0.1
  smtp_connect_timeout 30
  # 开启 SNMP 陷阱
  enable_traps
  # 标识本节点的 ID，发送邮件是会用到
  router_id LVS_DEVEL
}

# 用于健康检查
vrrp_script check_haproxy {
  # 检查 haproxy 是否正在运行
  script "pidof haproxy"
  # 检查的时间间隔
  interval 1
  # 如果检查失败，vrrp_instace 的优先级会降低 5
  weight -5
  # 只要检查错误 2 次就算不健康
  fall 2
  # 成功 1 次就算健康
  rise 1
}

# 定义 vrrp_instance 组，使组内成员动作一致，即只要组内任一成员出现故障并切换，其余成员会跟着切换（即使没有发送故障）
vrrp_sync_group VG_KUBERNETES {
  group {
    VI_KEBE_APISERVER
    VI_EGDE_GATEWAY
  }
  # 切换为 MASTER 节点时所执行的脚本
  # notify_master /path/to_master.sh
  # 切换为 BACKUP 节点时所执行的脚本
  # notify_backup /path/to_backup.sh
  # 切换失败是所执行的脚本
  # notify_fault "/path/fault.sh VG_1"
  # 切换任一状态所执行的脚本，并且在以上三个几哦啊吧之后执行，keepalived会自动传递三个参数（$1 = "GROUP"|"INSTANCE"，$2 = name of group or instance，$3 = target state of transition(MASTER/BACKUP/FAULT)）。
  # notify /path/notify.sh
  # 是否开启邮件通知
  # smtp_alert
}

# 定义对外提供服务的 VIP 区域及相关属性
# kube-apiserver
vrrp_instance VI_KEBE_APISERVER {
  # 可选值：MASTER、BACKUP，不过当其他节点keepalived启动时会将priority比较大的节点选举为MASTER，因此该项其实没有实质用途。
  state MASTER
  priority 100
  # 具有固定
  interface eth1 # VRRP 实例绑定的网卡
  track_interface {
    eth1
  }
  #vrrp_garp_master_repeat 5
  #vrrp_garp_master_refresh 10
  # 相同 VRID 的属于同一组，根据优先级选举出一个 Master
  virtual_router_id 51
  # VRRP 心跳包的发送周期，单位为 s
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass kubecloud
  }
  virtual_ipaddress {
    # VRRP 心跳内容，VIP 地址
    172.72.4.2 dev eth1 label eth1:vip
  }
  # 虚拟路由，当VIP漂过来之后需要添加的路由信息
  # virtual_routes
  track_script {
    check_haproxy
  }
}

# 边界网关：用于访问集群内部的 Service 和 Pod
vrrp_instance VI_EGDE_GATEWAY {
  state MASTER
  # 如果优先级相同，则不论最初设置的状态是 MASTER 还是 BACKUP，VIP 都会漂移到 IP 地址较大的节点
  priority 100
  interface eth1 # VRRP 实例绑定的网卡
  track_interface {
    eth1
  }
  vrrp_garp_master_repeat 5
  vrrp_garp_master_refresh 10
  # 相同 VRID 的属于同一组，根据优先级选举出一个 Master
  virtual_router_id 51
  # VRRP 心跳包的发送周期，单位为 s
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass kubecloud
  }
  virtual_ipaddress {
    172.72.4.3 dev eth1 label eth1:vip
  }
}

virtual_server 172.72.4.2 8080 {
  delay_loop 6
  lb_algo loadbalance
  lb_kind DR
  #lb_algo rr
  #lb_kind NAT
  nat_mask 255.255.255.0
  persistence_timeout 0
  protocol TCP

  real_server 172.72.4.100 8080 {
    weight 1
    TCP_CHECK {
      connect_timeout 3
    }
  }
  real_server 172.72.4.101 8080 {
    weight 1
    TCP_CHECK {
      connect_timeout 3
    }
  }
}
```

相关说明：
  * 

* 备

```
state BACKUP
priority 97
```

## 参考

* [](http://outofmemory.cn/wiki/keepalived-configuration)
