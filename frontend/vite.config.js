import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,
        proxy: {
            '/alugueis': 'http://192.168.0.7:8000',
            '/proprietarios': 'http://192.168.0.7:8000',
            '/imoveis': 'http://192.168.0.7:8000',
            '/participacoes': 'http://192.168.0.7:8000',
            // Adicione outras rotas de API se necessário
        }
    }
});
