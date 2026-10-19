import java.io.*;
import java.util.*;

/*
	Tournament settings, read from torneio.properties in the sketch folder.
	See torneio.properties.example for every key.
*/
public class TorneioConfig {

	public String apiBaseUrl = "http://localhost:8080";
	public String email = "";
	public String senha = "";
	public long torneioId = 1L;

	public int jogadoresPorTime = 2;
	public float duracaoSegundos = 60 * 5;
	public boolean golDeOuro = true;

	// Team id on the chaveamento -> Team class name in this sketch
	private Map<Long, String> classesDosTimes = new HashMap<Long, String>();

	public static TorneioConfig carregar(String path){
		File file = new File(path);
		if(!file.exists())
			throw new RuntimeException("Arquivo " + file.getName() + " nao encontrado. Copie torneio.properties.example para torneio.properties e preencha.");

		Properties p = new Properties();
		try(Reader in = new InputStreamReader(new FileInputStream(file), "UTF-8")){
			p.load(in);
		}catch(IOException e){
			throw new RuntimeException("Erro ao ler " + file.getName() + ": " + e.getMessage());
		}

		TorneioConfig c = new TorneioConfig();
		c.apiBaseUrl = p.getProperty("api.url", c.apiBaseUrl).trim().replaceAll("/+$", "");
		c.email = p.getProperty("api.email", "").trim();
		c.senha = p.getProperty("api.senha", "").trim();
		c.torneioId = Long.parseLong(p.getProperty("torneio.id", "1").trim());
		c.jogadoresPorTime = Integer.parseInt(p.getProperty("jogo.jogadoresPorTime", "2").trim());
		c.duracaoSegundos = Float.parseFloat(p.getProperty("jogo.duracaoSegundos", "300").trim());
		c.golDeOuro = Boolean.parseBoolean(p.getProperty("jogo.golDeOuro", "true").trim());

		for(String key : p.stringPropertyNames()){
			if(!key.startsWith("time."))
				continue;
			try{
				Long id = Long.parseLong(key.substring("time.".length()).trim());
				c.classesDosTimes.put(id, p.getProperty(key).trim());
			}catch(NumberFormatException e){
				System.out.println("Ignorando chave invalida em torneio.properties: " + key);
			}
		}

		return c;
	}

	public String classeDoTime(Long timeId){
		return classesDosTimes.get(timeId);
	}
}
