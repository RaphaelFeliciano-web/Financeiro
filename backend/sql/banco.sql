CREATE TABLE `transacoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `descricao` varchar(255) NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `tipo` enum('receita','despesa') NOT NULL,
  `forma_pagamento` enum('pix','debito','credito') NOT NULL,
  `categoria` varchar(100) NOT NULL,
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
