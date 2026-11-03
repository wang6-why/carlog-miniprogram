package com.carlog.common;

/**
 * 当前登录用户上下文
 *
 * 用 ThreadLocal 存放拦截器解析出的 userId，Service 层直接取，
 * 避免每个方法签名都多传一个 userId 参数。
 * afterCompletion 里必须 remove，否则线程池复用会串号——这是这类写法最常见的坑。
 */
public final class UserContext {

    private static final ThreadLocal<Long> HOLDER = new ThreadLocal<>();

    private UserContext() {
    }

    public static void set(Long userId) {
        HOLDER.set(userId);
    }

    public static Long get() {
        return HOLDER.get();
    }

    public static Long require() {
        Long id = HOLDER.get();
        if (id == null) {
            throw new BizException(401, "登录已失效，请重新登录");
        }
        return id;
    }

    public static void clear() {
        HOLDER.remove();
    }
}
