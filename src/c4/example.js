// Modelo de exemplo: uma loja com contexto, conteineres, um diagrama de
// componentes da API e um de conteineres do ERP.
export function exampleModel() {
  return {
    sistema: { nome: 'Loja', descricao: 'Vende online' },
    contexto: {
      elementos: [
        { id: 'erp', nome: 'ERP', tipo: 'sistema_externo', tecnologia: '', descricao: 'Faturamento' },
        { id: 'cliente', nome: 'Cliente', tipo: 'pessoa', tecnologia: '', descricao: 'Compra produtos' },
      ],
      relacoes: [
        { de: 'cliente', para: 'sistema', descricao: 'Compra produtos em', tecnologia: '' },
        { de: 'sistema', para: 'erp', descricao: 'Envia faturas para', tecnologia: '' },
      ],
    },
    conteineres: {
      fronteiras: [{ id: 'loja', nome: 'Loja', descricao: '' }],
      elementos: [
        { id: 'cliente', nome: 'Cliente', tipo: 'pessoa', tecnologia: '', descricao: 'Compra produtos', fronteira: '' },
        { id: 'web', nome: 'Loja Web', tipo: 'container', tecnologia: 'React', descricao: 'Vitrine e carrinho', fronteira: 'loja' },
        { id: 'api', nome: 'API de Pedidos', tipo: 'container', tecnologia: 'Java/Quarkus', descricao: 'Recebe pedidos', fronteira: 'loja' },
        { id: 'db', nome: 'Banco de Pedidos', tipo: 'banco_dados', tecnologia: 'PostgreSQL', descricao: 'Guarda pedidos', fronteira: 'loja' },
        { id: 'erp', nome: 'ERP', tipo: 'sistema_externo', tecnologia: '', descricao: 'Faturamento', fronteira: '' },
      ],
      relacoes: [
        { de: 'cliente', para: 'web', descricao: 'Faz pedidos em', tecnologia: 'HTTPS' },
        { de: 'web', para: 'api', descricao: 'Envia pedidos para', tecnologia: 'HTTPS/JSON' },
        { de: 'api', para: 'db', descricao: 'Lê e grava pedidos em', tecnologia: 'JDBC' },
        { de: 'api', para: 'erp', descricao: 'Envia faturas para', tecnologia: 'REST' },
      ],
    },
    detalhes: [
      {
        id: 'DET-001', tipo: 'c4-component', titulo: '', descricao: 'Recebimento de pedidos',
        origem: { visao: 'conteineres', elemento: 'api', nome: 'API de Pedidos' },
        fronteiras: [],
        elementos: [
          { id: 'web', nome: 'Loja Web', tipo: 'container', tecnologia: 'React', descricao: 'Vitrine', fronteira: '' },
          { id: 'ctrl', nome: 'Controlador de Pedidos', tipo: 'componente', tecnologia: 'JAX-RS', descricao: 'Recebe pedidos', fronteira: '' },
        ],
        relacoes: [{ de: 'web', para: 'ctrl', descricao: 'Envia pedidos para', tecnologia: 'HTTPS/JSON' }],
      },
      {
        id: 'DET-002', tipo: 'c4-container', titulo: 'ERP por dentro', descricao: '',
        origem: { visao: 'contexto', elemento: 'erp', nome: 'ERP' },
        fronteiras: [{ id: 'erp', nome: 'ERP', descricao: '' }],
        elementos: [
          { id: 'loja', nome: 'Loja', tipo: 'sistema_externo', tecnologia: '', descricao: 'Envia faturas', fronteira: '' },
          { id: 'fat', nome: 'Faturador', tipo: 'container', tecnologia: 'SAP', descricao: 'Emite notas', fronteira: 'erp' },
        ],
        relacoes: [{ de: 'loja', para: 'fat', descricao: 'Envia faturas para', tecnologia: 'REST' }],
      },
    ],
  };
}
