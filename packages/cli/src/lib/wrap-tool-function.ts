export default function wrap<T extends (...args: any[]) => any>(
  func: T
): (...funcArgs: Parameters<T>) => ReturnType<T> | string {
  return (...args: Parameters<T>): ReturnType<T> | string => {
    try {
      return func(...args);
    } catch (error) {
      if (error instanceof Error) {
        console.log('SENDING ERROR STRING');
        return error.toString();
      }
      throw error;
    }
  };
}
