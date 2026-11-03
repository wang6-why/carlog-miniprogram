package com.carlog.common;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * 全局异常处理
 *
 * 关键点：HTTP 状态码统一回 200（或业务相关的 4xx），真正给前端看的判定在 body 的 code 上。
 * 小程序 wx.request 对 4xx/5xx 只会拿到 statusCode，拿不到业务提示，
 * 统一成 200 + code 是最省事的做法。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BizException.class)
    public R<Void> handleBiz(BizException e, HttpServletRequest req) {
        log.warn("业务异常 {} {} -> {}", req.getMethod(), req.getRequestURI(), e.getMessage());
        return R.fail(e.getCode(), e.getMessage());
    }

    /** @Valid 校验失败：把第一个字段错误直接抛给用户，别返回一坨 JSON */
    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public R<Void> handleInvalid(BindException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("；"));
        return R.fail(422, msg.isEmpty() ? "参数校验失败" : msg);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public R<Void> handleOther(Exception e, HttpServletRequest req) {
        // 未预期异常要留完整栈，否则线上只能靠猜
        log.error("未处理异常 {} {}", req.getMethod(), req.getRequestURI(), e);
        return R.fail(500, "服务器开小差了，请稍后再试");
    }
}
