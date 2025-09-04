# Use uma imagem base oficial do Node.js, leve e segura.
FROM node:18-alpine

# Crie e defina o diretório de trabalho dentro do contêiner.
WORKDIR /app

# Copie o package.json e o package-lock.json para o diretório de trabalho.
# Isso aproveita o cache de camadas do Docker. A instalação do npm só será executada novamente se esses arquivos mudarem.
COPY package*.json ./

# Instale as dependências do projeto.
RUN npm install

# Copie TODO o restante do código da sua aplicação para o diretório de trabalho.
# Esta é a etapa crucial que copia as pastas 'routes' e 'models'.
COPY . .

# Exponha a porta em que a aplicação será executada dentro do contêiner.
EXPOSE 3000

# Comando para iniciar a aplicação quando o contêiner for executado.
CMD [ "node", "server.js" ]

