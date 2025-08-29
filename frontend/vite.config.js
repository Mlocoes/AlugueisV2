import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,
        proxy: {
            '/alugueis': 'http://localhost:8000',
            '/proprietarios': 'http://localhost:8000',
            '/imoveis': 'http://localhost:8000',
            '/participacoes': 'http://localhost:8000',
            // Adicione outras rotas de API se necessário
        }
    }
});
