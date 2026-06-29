import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BomRecipesService, mapRecipeToResponse } from './bom-recipes.service';
import { PrismaService } from '../prisma.service';
import { CreateBomRecipeDto } from './dto/create-bom-recipe.dto';
import { UpdateBomRecipeDto } from './dto/update-bom-recipe.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

describe('BomRecipesService', () => {
  let service: BomRecipesService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    company: { findFirst: jest.fn() },
    product: { findFirst: jest.fn() },
    material: { findMany: jest.fn() },
    bomRecipe: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    bomLine: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  // Use plain numbers for mock data to avoid BigInt JSON.stringify issues
  const mockCompany = { id: 1, tenantId: 1, name: 'Test Co' };
  const mockCompanyId = BigInt(1);
  const mockTenantId = BigInt(1);
  const mockUserId = BigInt(1);
  const mockRecipeId = 1;
  const mockProductId = 10;
  const mockMaterialId = 100;

  const mockProduct = {
    id: 10,
    companyId: 1,
    name: 'Test Product',
    sku: 'TP-001',
  };
  const mockMaterial = {
    id: 100,
    companyId: 1,
    name: 'Raw Material',
    code: 'RM-001',
    purchasePrice: 50,
  };
  const mockRecipeRecord = {
    id: 1,
    companyId: 1,
    productId: 10,
    version: 'v1',
    outputQty: 1,
    wastagePct: 5,
    laborCost: 10,
    overheadCost: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockFullRecipe = {
    ...mockRecipeRecord,
    product: { id: 10, name: 'Test Product', sku: 'TP-001' },
    bomLines: [
      {
        id: 1,
        bomId: 1,
        materialId: 100,
        qtyPerOutput: 2,
        unitCost: 0,
        wastagePct: 10,
        material: {
          id: 100,
          name: 'Raw Material',
          code: 'RM-001',
          purchasePrice: 50,
        },
      },
    ],
  };

  const createDto: CreateBomRecipeDto = {
    productId: '10',
    version: 'v1',
    outputQty: 1,
    wastagePct: 5,
    laborCost: 10,
    overheadCost: 5,
    isActive: true,
    bomLines: [
      { materialId: '100', qtyPerOutput: 2, unitCost: 0, wastagePct: 10 },
    ],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BomRecipesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BomRecipesService>(BomRecipesService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a BOM recipe with lines and calculate total cost', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.material.findMany.mockResolvedValue([mockMaterial]);
      mockPrisma.bomRecipe.create.mockResolvedValue(mockRecipeRecord);
      mockPrisma.bomRecipe.findUnique.mockResolvedValue(mockFullRecipe);

      const result = await service.create(
        createDto,
        mockCompanyId,
        mockTenantId,
        mockUserId,
      );

      expect(mockPrisma.company.findFirst).toHaveBeenCalledWith({
        where: { id: mockCompanyId, tenantId: mockTenantId },
      });
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: BigInt('10'), companyId: mockCompanyId },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.bomRecipe.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          productId: BigInt('10'),
          version: 'v1',
        }),
      });
      expect(mockPrisma.bomLine.createMany).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.product.name).toBe('Test Product');
      expect(result.totalMaterialCost).toBeGreaterThan(0);
      expect(result.estimatedCost).toBeGreaterThan(0);
    });

    it('should throw NotFoundException if company not found under tenant', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product does not belong to company', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if materials do not belong to company', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);
      mockPrisma.material.findMany.mockResolvedValue([]);

      await expect(
        service.create(createDto, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated BOMs', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.bomRecipe.count.mockResolvedValue(1);
      mockPrisma.bomRecipe.findMany.mockResolvedValue([mockFullRecipe]);

      const pagination: PaginationDto = { page: 1, limit: 10 };
      const result = await service.findAll(
        mockCompanyId,
        mockTenantId,
        pagination,
      );

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].product.name).toBe('Test Product');
    });

    it('should throw NotFoundException if company not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(null);

      await expect(
        service.findAll(mockCompanyId, mockTenantId, { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a BOM by id', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.bomRecipe.findFirst.mockResolvedValue(mockFullRecipe);

      const result = await service.findOne(
        mockRecipeId,
        mockCompanyId,
        mockTenantId,
      );

      expect(result.id).toBe('1');
      expect(result.product.name).toBe('Test Product');
    });

    it('should throw NotFoundException if BOM not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.bomRecipe.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockRecipeId, mockCompanyId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('explodeCost', () => {
    it('should calculate material cost including wastage via explodeSalesPlan', async () => {
      mockPrisma.bomRecipe.findFirst.mockResolvedValue(mockFullRecipe);
      const salesPlan = [{ productId: '10', quantity: 10 }];

      const result = await service.explodeSalesPlan(mockCompanyId, salesPlan);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].productId).toBe('10');
      expect(result.products[0].salesQty).toBe(10);
      expect(result.totalMaterialCost).toBeGreaterThan(0);
      expect(result.grandTotalCost).toBeGreaterThan(0);
      expect(result.materials).toHaveLength(1);
    });

    it('should handle missing recipes gracefully', async () => {
      mockPrisma.bomRecipe.findFirst.mockResolvedValue(null);
      const salesPlan = [{ productId: '999', quantity: 5 }];

      const result = await service.explodeSalesPlan(mockCompanyId, salesPlan);

      expect(result.products).toHaveLength(0);
      expect(result.materials).toHaveLength(0);
      expect(result.grandTotalCost).toBe(0);
    });
  });

  describe('update', () => {
    const updateDto: UpdateBomRecipeDto = { version: 'v2' };

    it('should update a BOM recipe and recalculate costs', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.bomRecipe.findFirst.mockResolvedValue(mockFullRecipe);
      mockPrisma.bomRecipe.update.mockResolvedValue(mockRecipeRecord);
      mockPrisma.bomRecipe.findUnique.mockResolvedValue(mockFullRecipe);

      const result = await service.update(
        mockRecipeId,
        updateDto,
        mockCompanyId,
        mockTenantId,
        mockUserId,
      );

      expect(mockPrisma.bomRecipe.findFirst).toHaveBeenCalledWith({
        where: { id: mockRecipeId, companyId: mockCompanyId },
        include: expect.any(Object),
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if BOM not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.bomRecipe.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          mockRecipeId,
          updateDto,
          mockCompanyId,
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate product on update if productId provided', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.bomRecipe.findFirst.mockResolvedValue(mockFullRecipe);
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const dtoWithProduct: UpdateBomRecipeDto = { productId: '999' };

      await expect(
        service.update(
          mockRecipeId,
          dtoWithProduct,
          mockCompanyId,
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate materials on update if bomLines provided', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.bomRecipe.findFirst.mockResolvedValue(mockFullRecipe);
      mockPrisma.material.findMany.mockResolvedValue([]);

      const dtoWithLines: UpdateBomRecipeDto = {
        bomLines: [{ materialId: '999', qtyPerOutput: 1 }],
      };

      await expect(
        service.update(
          mockRecipeId,
          dtoWithLines,
          mockCompanyId,
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a BOM recipe', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.bomRecipe.findFirst.mockResolvedValue(mockFullRecipe);
      mockPrisma.bomRecipe.delete.mockResolvedValue(mockFullRecipe);

      const result = await service.remove(
        mockRecipeId,
        mockCompanyId,
        mockTenantId,
        mockUserId,
      );

      expect(mockPrisma.bomRecipe.delete).toHaveBeenCalledWith({
        where: { id: mockRecipeId },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'BomRecipe',
          action: 'delete',
        }),
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if BOM not found', async () => {
      mockPrisma.company.findFirst.mockResolvedValue(mockCompany);
      mockPrisma.bomRecipe.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockRecipeId, mockCompanyId, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
