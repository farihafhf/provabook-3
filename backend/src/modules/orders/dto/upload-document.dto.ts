import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum DocumentCategory {
  SAMPLE = 'sample',
  LC = 'lc',
  PI = 'pi',
  TEST_REPORT = 'test_report',
  EMAIL = 'email',
  OTHER = 'other',
}

export enum SampleSubcategory {
  LAB_DIP = 'lab_dip',
  STRIKE_OFF = 'strike_off',
  QUALITY_TEST = 'quality_test',
  BULK_SWATCH = 'bulk_swatch',
  PP_SAMPLE = 'pp_sample',
}

export class UploadDocumentDto {
  @ApiProperty({ 
    enum: DocumentCategory,
    example: DocumentCategory.SAMPLE,
    description: 'Category of the document'
  })
  @IsEnum(DocumentCategory)
  @IsNotEmpty()
  category: DocumentCategory;

  @ApiProperty({ 
    enum: SampleSubcategory,
    required: false,
    example: SampleSubcategory.LAB_DIP,
    description: 'Subcategory for sample documents'
  })
  @IsEnum(SampleSubcategory)
  @IsOptional()
  subcategory?: SampleSubcategory;

  @ApiProperty({ 
    required: false,
    example: 'Lab dip sample for navy blue color',
    description: 'Optional description of the document'
  })
  @IsString()
  @IsOptional()
  description?: string;
}
