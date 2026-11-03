/**
 * 全局配置
 *
 * USE_REMOTE = true  时，小程序会连真实后端（Spring Boot 那套）。
 * 默认 false，照常使用本地存储数据，保证离线也能演示。
 *
 * 注意：这是被各模块共享的单例对象，运行时修改它的属性（如设置页开关）
 * 其它模块读到的会同步变化。
 */
module.exports = {
  // 是否启用真实后端
  USE_REMOTE: false,

  // 后端基础地址（含 context-path /api）。
  // 真机调试填你电脑的局域网 IP，例如 http://192.168.1.50:8088/api
  //（localhost 在真机上指向手机自身，必须用电脑 IP 或公网域名）
  API_BASE: 'https://your-domain.example.com/api',

  // 登录态存储 key
  TOKEN_KEY: 'jwt_token',

  // 演示用自动登录账号（后端 DataSeeder 灌入的 demo/123456）
  DEMO_USER: 'demo',
  DEMO_PASS: '123456'
};
