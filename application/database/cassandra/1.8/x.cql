CREATE KEYSPACE IF NOT EXISTS mtb 
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

CREATE TABLE IF NOT EXISTS mtb.target_history_0(
  /* 唯一的 id */
  unique_id bigint PRIMARY KEY,

  /* 获取时的时间戳 */
  acquisition_time bigint,
  
  /* 设备监控对象类型（默认：0 为船舶，1 为车辆，2 为吊机，总共分 8 大类，0-7 编号） */
  target_type int,

  /* 0 为 AIS 基站；1 为卫星数据；2 为车载终端；3 为码头 TOS 系统 */
  data_source int,

  /* 指数据采集的来源，取值 0-255。246：博懋数据，248：船讯网数据 */
  data_supplier int,

  /* 0：在航；1：锚泊；2：失控；3：操作受限；4：吃水受限；5：靠泊；6：搁浅；7：捕捞作业；8：靠船帆提供动力；9-15：未定义 */
  status int,

  /* 单位：1 / 1000000 度，范围: [-1.8×108,1.8×108]，经度：东 = + ；西 = - ； */
  longitude bigint,

  /* 单位：1 / 1000000 度，范围: [-9×107,9×107]，纬度：北 = +；南 = -； */
  latitude bigint,

  /* 在 0.1 X 0.1 粒度下的位置 id。此表新增加的字段，用于前台显示 */
  area_id bigint,
  
  /* 单位：1 / 10节，节：海里/小时 */
  speed int,

  /* 船：0.0514444（将速度转换为“米/秒”时乘以的系数） */
  conversion double,

  /* 航向。单位：1 / 100 度/秒，范围：[0,35900] */
  cog int,

  /* 首向。单位：1 / 100 度/秒，范围：[0,35900] */
  true_head int,

  /* 单位：千瓦 */
  power int,

  /* 暂空 */
  ext text,

  /* 对象私有扩展对象，以 “&”间隔，不同类型长度可能不同以船舶为例 */ 
  extend text
);

INSERT INTO mtb.target_history_0(
    unique_id,
    acquisition_time,
    target_type,
    data_source,
    data_supplier,
    status,
    longitude,
    latitude,
    area_id,
    speed,
    conversion,
    cog,
    true_head,
    power,
    ext,
    extend
) VALUES(212400000,1441036915,0,248,0,246,-5458323,53478838,1315745,6379,0.514444,6470,5300,0,'','0&0.1&&&&');

TRUNCATE mtb.target_history_0;