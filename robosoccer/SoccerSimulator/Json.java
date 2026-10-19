import java.util.*;

/*
	Minimal JSON parser used to read the chaveamento API responses.
	Objects become LinkedHashMap, arrays ArrayList, numbers Double.
*/
public class Json {

	private final String s;
	private int i = 0;

	private Json(String s){
		this.s = s;
	}

	public static Object parse(String text){
		Json p = new Json(text == null ? "" : text);
		p.skipSpaces();
		Object value = p.readValue();
		p.skipSpaces();
		if(p.i < p.s.length())
			throw new RuntimeException("JSON invalido na posicao " + p.i);
		return value;
	}

	/*
		Helpers to read typed values from a parsed object
	*/
	public static String getString(Object obj, String key){
		Object v = get(obj, key);
		return v == null ? null : String.valueOf(v);
	}

	public static Long getLong(Object obj, String key){
		Object v = get(obj, key);
		if(v instanceof Number)
			return ((Number)v).longValue();
		return null;
	}

	public static int getInt(Object obj, String key, int def){
		Object v = get(obj, key);
		if(v instanceof Number)
			return ((Number)v).intValue();
		return def;
	}

	public static Object get(Object obj, String key){
		if(obj instanceof Map)
			return ((Map)obj).get(key);
		return null;
	}

	public static String escape(String text){
		StringBuilder b = new StringBuilder();
		for(char c : text.toCharArray()){
			switch(c){
				case '"': b.append("\\\""); break;
				case '\\': b.append("\\\\"); break;
				case '\n': b.append("\\n"); break;
				case '\r': b.append("\\r"); break;
				case '\t': b.append("\\t"); break;
				default:
					if(c < 0x20)
						b.append(String.format("\\u%04x", (int)c));
					else
						b.append(c);
			}
		}
		return b.toString();
	}

	private void skipSpaces(){
		while(i < s.length() && Character.isWhitespace(s.charAt(i)))
			i++;
	}

	private Object readValue(){
		if(i >= s.length())
			throw new RuntimeException("JSON incompleto");

		char c = s.charAt(i);
		if(c == '{') return readObject();
		if(c == '[') return readArray();
		if(c == '"') return readString();
		if(s.startsWith("true", i)){ i += 4; return Boolean.TRUE; }
		if(s.startsWith("false", i)){ i += 5; return Boolean.FALSE; }
		if(s.startsWith("null", i)){ i += 4; return null; }
		return readNumber();
	}

	private Map<String, Object> readObject(){
		Map<String, Object> map = new LinkedHashMap<String, Object>();
		i++; // {
		skipSpaces();
		if(s.charAt(i) == '}'){ i++; return map; }

		while(true){
			skipSpaces();
			String key = readString();
			skipSpaces();
			expect(':');
			skipSpaces();
			map.put(key, readValue());
			skipSpaces();
			if(s.charAt(i) == ','){ i++; continue; }
			expect('}');
			return map;
		}
	}

	private List<Object> readArray(){
		List<Object> list = new ArrayList<Object>();
		i++; // [
		skipSpaces();
		if(s.charAt(i) == ']'){ i++; return list; }

		while(true){
			skipSpaces();
			list.add(readValue());
			skipSpaces();
			if(s.charAt(i) == ','){ i++; continue; }
			expect(']');
			return list;
		}
	}

	private String readString(){
		expect('"');
		StringBuilder b = new StringBuilder();
		while(true){
			char c = s.charAt(i++);
			if(c == '"')
				return b.toString();
			if(c != '\\'){
				b.append(c);
				continue;
			}
			char e = s.charAt(i++);
			switch(e){
				case 'n': b.append('\n'); break;
				case 'r': b.append('\r'); break;
				case 't': b.append('\t'); break;
				case 'b': b.append('\b'); break;
				case 'f': b.append('\f'); break;
				case 'u':
					b.append((char)Integer.parseInt(s.substring(i, i + 4), 16));
					i += 4;
					break;
				default: b.append(e);
			}
		}
	}

	private Double readNumber(){
		int start = i;
		while(i < s.length() && "+-0123456789.eE".indexOf(s.charAt(i)) >= 0)
			i++;
		if(start == i)
			throw new RuntimeException("JSON invalido na posicao " + i);
		return Double.valueOf(s.substring(start, i));
	}

	private void expect(char c){
		if(i >= s.length() || s.charAt(i) != c)
			throw new RuntimeException("JSON invalido: esperado '" + c + "' na posicao " + i);
		i++;
	}
}
