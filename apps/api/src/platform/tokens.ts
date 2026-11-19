/** Injection tokens for the kernel's shared primitives. */
export const APP_ENV = Symbol('APP_ENV')
export const LOGGER = Symbol('LOGGER')
export const DATABASE = Symbol('DATABASE')
export const REDIS = Symbol('REDIS')
export const EVENT_BUS = Symbol('EVENT_BUS')
export const AUDIT_RECORDER = Symbol('AUDIT_RECORDER')
export const MODULE_DESCRIPTORS = Symbol('MODULE_DESCRIPTORS')