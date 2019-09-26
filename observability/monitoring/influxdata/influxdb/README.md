# InfluxDB

InfluxDB 是一个开源的分布式时序数据库。

特点：

  * 分布式，水平伸缩，支持 line protocol 入库；
  * 一条 Point 多条 Series；
  * 多个 Series 对应一个 Retention Policy；
  * 每个库多个 Shard -- 每个 Shard 多个 Series；


## 概念

### 基本概念

| 名词         | 描述   |
| ----------- | ------ |
| database    | 数据库  |
| measurement | 数据表  |
| point       | 记录    |
| time        | 时间戳，缺省时系统会自动指定 |
| tag         | 标签，数据表中的索引字段，k/v 形式 |
| field       | 领域，数据表中的普通字段，k/v 形式，用于存放数值数据 |
| series      | 序列，由 retention policy, measurement, tagset 排列组合的曲线 |
| point       | 点，就是某个 series 的某个时刻的多个 field 的 value，就组成了一个 point；其实就是一般曲线上的一个点 |
| retention policy | 保留策略 |

相关说明：

  * 插入数据时，time、tag 和 field 之间用空格分隔；
  * Point 由 `time`、`tag`、`field` 组成。

### 函数

* 聚合类函数

| 函数         | 描述   | 示例 |
| ----------- | -------------------- | ------ |
| COUNT()     | 返回某个 field 字段的非空值的数量 | SELECT COUNT(value) FROM "filesystem/limit" |
| DISTINCT()  | 返回某个 field 字段的唯一值 | SELECT DISTINCT(value) FROM "filesystem/limit" LIMIT 10 |
| MEAN()      | 返回某个 field 字段的值的平均值 | SELECT MEAN(value) FROM "filesystem/limit" |
| MEADIAN()   | 返回某个 field 字段的值的中位数 | SELECT MEDIAN(value) FROM "filesystem/limit" |
| SPREAD()    | 返回某个 field 字段的最大值与最小值的差值 | SELECT SPREAD(value) FROM "filesystem/limit" |
| SUM()       | 返回某个 field 字段的所有值的和 | SELECT SUM(value) FROM "filesystem/limit" |

* 选择类函数

| 函数         | 描述   | 示例 |
| ----------- | -------------------- | ------ |
| TOP()       | 返回某个 field 字段中的最大 N 个值，字段类型：长整型、 float64 | SELECT TOP(value, 5) FROM "filesystem/limit" |
| BOTTOM()    | 返回某个 field 字段中的最小 N 个值，字段类型：长整型、 float64 | SELECT BOTTOM(value, 5) FROM "filesystem/limit" |
| FIRST()     | 返回某个 field 字段中的第一个值 | SELECT FIRST(value) FROM "filesystem/limit" |
| LAST()      | 返回某个 field 字段中的最新值 | SELECT LAST(value) FROM "filesystem/limit" |
| MAX()       | 返回某个 field 字段中的最大值，字段类型：长整型、float64、布尔类型 | SELECT MAX(value) FROM "filesystem/limit" |
| MIN()       | 返回某个 field 字段中的最小值，字段类型：长整型、float64、布尔类型 | SELECT MIN(value) FROM "filesystem/limit" |
| PERCENTILE()| 返回某个 field 字段中的排序值排位为N的百分值，百分值范围：[0, 100]| SELECT PERCENTILE(value, 99.9) FROM "filesystem/limit" |

* 变换类函数




## InfluxDB UI

InfluxDB 从 1.1.0 版本开始取消了 UI（8083 端口），并在 1.3.0 版本被移除。因此需要使用低版本来查看 InfluxDB UI，以及连接远程数据库。

```bash
$ docker run -itd --name influxdb-ui -p 8083:8083 influxdb:1.0.2-alpine
```


## InfluxDB 管理

### 安装二进制

```bash
$ ops/influxdb/install-influxdb-bin.sh
```

### 连接 InfluxDB

* 命令行

```bash
$ influx -host influxdb.monitoring.svc.cluster.local --port 8086 --username root --password root
```

### Database（数据库）

* 命令行

```bash
# 查看数据库
$ SHOW DATABASES
_internal
k8s

# 使用数据库
$ USE "k8s"
Using database k8s

# 创建数据库
$ CREATE DATABASE "mytsdb"

# 删除数据库
$ DROP DATABASE "mytsdb"
```

* HTTP API

```bash
# 查看数据库
$ curl 'http://influxdb.monitoring.svc.cluster.local:8086/query?q=SHOW+DATABASES'

# 创建数据库
$ curl -X POST 'http://influxdb.monitoring.svc.cluster.local:8086/query?q=CREATE+DATABASE+"mytsdb"'

# 删除数据库
$ curl -X POST 'http://influxdb.monitoring.svc.cluster.local:8086/query?q=DROP+DATABASE+"mytsdb"'
```

### Measurement（相当于 SQL 表）

* 命令行

```bash
# 查看所有表
$ SHOW MEASUREMENTS

# 新建表（只能通过插入数据来新建表）
$ insert my_mem_usage,hostname=node1 value=5242880

# 删除表
$ drop measurement my_mem_usage

# 查询 "cpu/usage" 表中的所有 tag
$ SHOW TAG KEYS FROM "cpu/usage"

# 查询 "cpu/usage" 表中的所有 field
$ SHOW FIELD KEYS FROM "cpu/usage"

# 查询 "cpu/usage" 表中 "cluster_name" tag 对应的 value（除了 "=" 操作，还有 "IN"、"=~" 操作）
$ SHOW TAG VALUES FROM "cpu/usage" WITH KEY = "cluster_name"
```

* HTTP API

```bash
# 查看 Measurement
$ curl 'http://influxdb.monitoring.svc.cluster.local:8086/query?q=SHOW+MEASUREMENTS&db=k8s&pretty=true'

# 查询 "cpu/usage" 表中的所有 key
$ curl 'http://influxdb.monitoring.svc.cluster.local:8086/query?q=SHOW+TAG+KEYS+FROM+"cpu/usage"&db=k8s'

# 查询 "cpu/usage" 表中 "cluster_name" key 对应的 value
$ curl 'http://influxdb.monitoring.svc.cluster.local:8086/query?q=SHOW+TAG+VALUES+FROM+"cpu/usage"+WITH+KEY+=+"cluster_name"&db=k8s'
```

### 增删改查

* 命令行

InfluxDB `insert` 中，表名与数据之间用逗号分隔，tag 和 field 用空格分隔，多个 tag 或者多个 field 之间也用逗号分隔。InfluxDB 属于时序数据库，并没有直接提供修改和删除操作，对于删除而言可以通过保留策略（Retention Policy）来实现。

```bash
# 添加数据
$ insert mytb,tag1=k1,tag2=k2 filed1=10,field2=20

# 查询数据
$ select * from mytb where tag1='k1' limit 10
```

* HTTP API

```bash
# 添加数据（数据库事先创建）
$ curl -X POST 'http://influxdb.monitoring.svc.cluster.local:8086/write?q=INSERT+"mytb,tag1=k1,tag=k2"+"field1=10,field2=20"+&db=mytsdb'

# 查询数据
$ curl -X POST 'http://influxdb.monitoring.svc.cluster.local:8086/query?q=SELECT+*+FROM+mytb+WHERE+tag1="k1"+LIMIT+10+&db=mytsdb'
```

相关字段：
  * epoch=s
  * chunk_size=200

### Retention Policy（保留策略）

保留策略用于定义数据库中数据的保留时间、副本数，一个数据库可以定义多个保留策略，但每个策略必须是独一无二的。

* 命令行

```bash
# 查看数据库的保留策略
$ SHOW RETENTION POLICIES ON "k8s"
name    duration shardGroupDuration replicaN default
----    -------- ------------------ -------- -------
default 0s       168h0m0s           1        true
```

字段含义：
  * name: 名称；
  * duration: 持续时间，`0` 表示无限制；
  * shardGroupDuration: shardGroup（InfluxDB 的一个基本存储结构） 的存储时间；
  * replicaN: 副本数；
  * default: 是否为默认策略。


```bash
# 创建保留策略（如果设置为默认的需要在末尾添加一个 "DEFAULT"）
$ CREATE RETENTION POLICY "30d" ON "k8s" DURATION 30d REPLICATION 1

# 修改保留策略
$ ALTER RETENTION PLICY "30d" ON "k8s" DURATION 7d

# 删除保留策略
$ DROP RETENTION POLICY "30d" ON "k8s"
```

* HTTP API

```bash
# 查看数据库的保留策略
$ curl 'http://influxdb.monitoring.svc.cluster.local:8086/query?q=SHOW+RETENTION+POLICIES+ON+"k8s"'

# 创建保留策略
$ curl -X POST 'http://influxdb.monitoring.svc.cluster.local:8086/query?q=CREATE+RETENTION+POLICY+"myrp"+ON+"k8s"+DURATION+30d+REPLICATION+1'

# 删除保留策略
$ curl -X POST 'http://influxdb.monitoring.svc.cluster.local:8086/query?q=DROP+RETENTION+POLICY+"myrp"+ON+"k8s"'
```

### Continuous Query（连续查询）

连续查询是指在数据库中自动定时运行一组语句，语句中必须包含 `SELECT` 关键词和 `GROUP BY time()` 关键词。InfluxDB 会将查询结果存放在指定的数据表中。

```bash
$ SHOW CONTINUOUS QUERIES

$ CREATE CONTINUOUS QUERY "cq_name" ON "db_name" BEGIN SELECT min("field") INTO "target_measurement" FROM "current_measurement" GROUP BY time(30m) END
```

### User

```bash
# 查询用户
$ SHOW USERS

# 创建普通用户
$ CREATE USER "test" WITH PASSWORD '123456'

# 创建管理员
$ CREATE USER "admin" WITH PASSWORD '123456' WITH ALL PRIVILEGES

# 删除用户
$ DROP USER "test"
```

### 其他

```bash
# 查看状态
$ SHOW STATS

# 诊断
$ SHOW DIAGNOSTICS
```


## 参考

* [InfluxDB Data Exploration](https://docs.influxdata.com/influxdb/v1.4/query_language/data_exploration/)
* [InfluxDB Authentication and Authorization](https://docs.influxdata.com/influxdb/v1.4/query_language/authentication_and_authorization/)
* [InfluxDB 系列学习教程](https://www.linuxdaxue.com/influxdb-study-series-manual.html)
