package com.carlog.common;

/**
 * 业务异常
 *
 * 只有「可预期」的错误才抛这个（参数不对、找不到资源、没权限），
 * 真正的代码 bug 让它照常冒到 500，别用 try-catch 把它吞掉。
 */
public class BizException extends RuntimeException {

    private final int code;

    public BizException(String message) {
        this(400, message);
    }

    public BizException(int code, String message) {
        super(message);
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static BizException notFound(String what) {
        return new BizException(404, what + "不存在");
    }

    public static BizException forbidden(String msg) {
        return new BizException(403, msg == null ? "无权访问" : msg);
    }
}
